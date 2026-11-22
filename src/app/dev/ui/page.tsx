export default async function UiPreviewPage() {
  const { ComponentPreview } = await import("./_preview/ComponentPreview");
  return <ComponentPreview />;
}
