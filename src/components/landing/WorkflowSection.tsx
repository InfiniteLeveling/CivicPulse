const workflow = [
  ["Citizen", "Spots a problem."],
  ["Issue report", "Adds details and a location."],
  ["AI assistance", "Reviews optional suggestions."],
  ["Duplicate review", "Checks similar open cases."],
  ["Priority queue", "Team reviews the score."],
  ["Authority assignment", "A department takes ownership."],
  ["Resolution", "Team records repair evidence."],
  ["Citizen feedback", "Resident reviews the outcome."],
];

export function WorkflowSection() {
  return (
    <section className="border-y bg-background" aria-labelledby="workflow-title">
      <div className="content-container section-space">
        <h2 id="workflow-title">Who handles each step?</h2>
        <ol className="workflow-list">
          {workflow.map(([title, text], index) => (
            <li key={title}><span aria-hidden="true">{index + 1}</span><div><h3>{title}</h3><p>{text}</p></div></li>
          ))}
        </ol>
      </div>
    </section>
  );
}
