import { useState } from "react";
import { Star, X, Loader2, SendHorizonal } from "lucide-react";
import { submitReview } from "../../services/firebase/turfService";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";

export default function ReviewModal({ turfId, turfName, bookingId, onClose, onSuccess }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }
    if (comment.trim().length < 10) {
      toast.error("Please write at least 10 characters in your review");
      return;
    }

    setSubmitting(true);
    try {
      await submitReview(turfId, {
        userUid: user.uid,
        userName: user.displayName || user.name || "Anonymous",
        rating,
        comment: comment.trim(),
        bookingId: bookingId || null,
      });
      toast.success("Review submitted! Thanks for your feedback.");
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
  const activeRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground">Rate Your Experience</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Reviewing: <span className="font-semibold text-foreground">{turfName}</span>
            </p>
          </div>

          {/* Star Picker */}
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Your Rating *</p>
            <div className="flex gap-2 items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-125 active:scale-110"
                >
                  <Star
                    className={`w-9 h-9 transition-colors duration-150 ${
                      star <= activeRating
                        ? "fill-accent text-accent"
                        : "fill-transparent text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              {activeRating > 0 && (
                <span className="ml-2 text-sm font-bold text-accent animate-in fade-in duration-150">
                  {ratingLabels[activeRating]}
                </span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              Your Review *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience — the facilities, staff, and overall vibe..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 rounded-2xl border border-border bg-secondary/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm leading-relaxed placeholder:text-muted-foreground/50"
            />
            <p className="text-[10px] text-muted-foreground mt-1 text-right">{comment.length}/500</p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><SendHorizonal className="w-4 h-4" /> Submit Review</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
