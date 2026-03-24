export default function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-card animate-pulse">
      <div className="aspect-[16/10] bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-muted rounded w-2/3" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="flex justify-between">
          <div className="h-6 bg-muted rounded w-20" />
          <div className="h-8 bg-muted rounded w-24" />
        </div>
      </div>
    </div>
  );
}
