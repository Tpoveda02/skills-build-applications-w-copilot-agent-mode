import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function focusForActivityType(type: string) {
  const activityFocus: Record<string, string> = {
    run: 'endurance',
    running: 'endurance',
    cycle: 'endurance',
    cycling: 'endurance',
    walk: 'endurance',
    walking: 'endurance',
    swim: 'endurance',
    swimming: 'endurance',
    strength: 'strength',
    weights: 'strength',
    yoga: 'mobility',
    stretching: 'mobility',
  };
  const normalizedType = type.trim().toLowerCase();
  return activityFocus[normalizedType] ?? normalizedType;
}

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (!isRecord(input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input;
  if (
    typeof userId !== 'string' ||
    typeof teamId !== 'string' ||
    !Types.ObjectId.isValid(userId) ||
    !Types.ObjectId.isValid(teamId)
  ) {
    throw Object.assign(new Error('Valid userId and teamId are required'), { status: 400 });
  }
  if (typeof type !== 'string' || type.trim().length === 0) {
    throw Object.assign(new Error('Activity type is required'), { status: 400 });
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes < 1) {
    throw Object.assign(new Error('Activity minutes must be a positive number'), { status: 400 });
  }

  const [user, team] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user or team was not found'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!isRecord(input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot } = input;
  const members = input.members ?? [];
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw Object.assign(new Error('Team name is required'), { status: 400 });
  }
  if (typeof mascot !== 'string' || mascot.trim().length === 0) {
    throw Object.assign(new Error('Team mascot is required'), { status: 400 });
  }
  if (!Array.isArray(members)) {
    throw Object.assign(new Error('Team members must be an array'), { status: 400 });
  }

  const memberIds: string[] = [];
  for (const memberId of members) {
    if (typeof memberId !== 'string' || !Types.ObjectId.isValid(memberId)) {
      throw Object.assign(new Error('Team member IDs must be valid'), { status: 400 });
    }
    memberIds.push(memberId);
  }
  const uniqueMemberIds = [...new Set(memberIds)];
  if (uniqueMemberIds.length > 0) {
    const memberCount = await User.countDocuments({ _id: { $in: uniqueMemberIds } });
    if (memberCount !== uniqueMemberIds.length) {
      throw Object.assign(new Error('One or more team members were not found'), { status: 404 });
    }
  }

  return Team.create({
    name: name.trim(),
    mascot: mascot.trim(),
    members: uniqueMemberIds,
  });
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().select({ name: 1 }).lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const pointsByTeam = new Map(totals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  const rankedTeams = teams
    .map((team) => ({
      teamName: team.name,
      totalPoints: pointsByTeam.get(team._id.toString()) ?? 0,
    }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName));

  return rankedTeams.map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail.trim().toLowerCase() }).lean();
  if (!user) {
    throw Object.assign(new Error('User was not found'), { status: 404 });
  }

  const [recentActivities, workouts] = await Promise.all([
    Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(5).select({ type: 1 }).lean(),
    Workout.find().lean(),
  ]);
  const goalFocus = user.fitnessGoal.trim().toLowerCase();
  const recentFocusCounts = new Map<string, number>();
  for (const activity of recentActivities) {
    const focus = focusForActivityType(activity.type);
    recentFocusCounts.set(focus, (recentFocusCounts.get(focus) ?? 0) + 1);
  }

  return workouts
    .filter((workout) => {
      const workoutFocus = workout.focus.trim().toLowerCase();
      return workoutFocus === goalFocus || recentFocusCounts.has(workoutFocus);
    })
    .sort((left, right) => {
      const score = (focus: string) => focus === goalFocus
        ? recentActivities.length + 1
        : recentFocusCounts.get(focus) ?? 0;
      return score(right.focus.trim().toLowerCase()) - score(left.focus.trim().toLowerCase());
    })
    .map((workout) => {
      const workoutFocus = workout.focus.trim().toLowerCase();
      const matchingRecentActivity = recentActivities.find((activity) =>
        focusForActivityType(activity.type) === workoutFocus,
      );
      const reason = workoutFocus === goalFocus
        ? `Matches your ${user.fitnessGoal} goal${matchingRecentActivity ? ` and recent ${matchingRecentActivity.type} activity` : ''}.`
        : `Recommended based on your recent ${matchingRecentActivity?.type} activity.`;
      return { ...workout, reason };
    });
}

export { User };
