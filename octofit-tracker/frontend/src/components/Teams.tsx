import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Team = { _id?: string; name: string; mascot?: string; members?: string[] };
type TeamResponse = { teams: Team[] };

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<TeamResponse>('/api/teams')
      .then(({ teams: result }) => {
        if (active) setTeams(result);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => { active = false; };
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Teams</h2>
    <p>Manage teams and members.</p>
    {hasError ? <p role="alert">Unable to load teams. Please try again.</p>
      : teams === undefined ? <p role="status">Loading teams...</p>
        : teams.length === 0 ? <p>No teams yet.</p>
          : <ul className="list-group">{teams.map((team, index) =>
            <li className="list-group-item" key={team._id ?? `${team.name}-${index}`}>
              <strong>{team.name}</strong>{team.mascot ? ` - ${team.mascot}` : ''}
              <span> - {team.members?.length ?? 0} members</span>
            </li>,
          )}</ul>}
  </div></section>;
}
