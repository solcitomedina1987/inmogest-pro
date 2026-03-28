type Props = { params: Promise<{ id: string }> };

export default async function PropiedadPublicaPage({ params }: Props) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-xl font-semibold">Propiedad</h1>
      <p className="text-sm text-neutral-600">ID: {id} — detalle e imágenes (pendiente).</p>
    </main>
  );
}
