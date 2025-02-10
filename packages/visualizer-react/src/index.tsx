import "./style.css";

export type VisualizerProps = {
  data: Record<string, unknown>;
  test: string;
};

export function Visualizer({ data }: VisualizerProps) {
  console.log(data);
  return (
    <div className="container">
      <h1 className="container_title">Visualizer</h1>
      {Object.entries(data).map(([key, value]) => {
        return (
          <p>
            <span>{key}</span>
            <span>{String(value)}</span>
          </p>
        );
      })}
    </div>
  );
}
