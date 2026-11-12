import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Activity = { _id?: string; type: string; minutes: number; points: number };
type ActivityResponse = { activities: Activity[] };

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<ActivityResponse>('/api/activities')
      .then(({ activities: result }) => {
        if (active) setActivities(result);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => { active = false; };
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Activities</h2>
    <p>Track student activity minutes and points.</p>
    {hasError ? <p role="alert">Unable to load activities. Please try again.</p>
      : activities === undefined ? <p role="status">Loading activities...</p>
        : activities.length === 0 ? <p>No activities yet.</p>
          : <ul className="list-group">{activities.map((activity, index) =>
            <li className="list-group-item" key={activity._id ?? `${activity.type}-${index}`}>
              {activity.type} - {activity.minutes} minutes - {activity.points} points
            </li>,
          )}</ul>}
  </div></section>;
}
