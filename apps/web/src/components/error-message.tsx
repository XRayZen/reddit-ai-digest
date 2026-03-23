export function ErrorMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="error-message" role="alert">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
