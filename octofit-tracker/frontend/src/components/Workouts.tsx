import { useEffect, useState } from 'react';
import { getJson } from '../api/client.js';

type Workout = { _id?: string; title: string; focus?: string; minutes?: number; difficulty?: string; reason?: string };
type WorkoutResponse = { suggestions: Workout[] };

export default function Workouts() {
  const [suggestions, setSuggestions] = useState<Workout[]>();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    getJson<WorkoutResponse>('/api/workouts/suggestions/mona%40example.com')
      .then(({ suggestions: result }) => {
        if (active) setSuggestions(result);
      })
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => { active = false; };
  }, []);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">Workout suggestions</h2>
    <p>Recommend workouts from activity patterns.</p>
    {hasError ? <p role="alert">Unable to load workout suggestions. Please try again.</p>
      : suggestions === undefined ? <p role="status">Loading workout suggestions...</p>
        : suggestions.length === 0 ? <p>No workout suggestions yet.</p>
          : <ul className="list-group">{suggestions.map((workout, index) =>
            <li className="list-group-item" key={workout._id ?? `${workout.title}-${index}`}>
              <strong>{workout.title}</strong>
              {workout.focus ? <span> - {workout.focus}</span> : null}
              {workout.reason ? <p className="mb-0">{workout.reason}</p> : null}
            </li>,
          )}</ul>}
  </div></section>;
}
