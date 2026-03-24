import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { 
  Upload, 
  X, 
  Loader2, 
  ImagePlus, 
  ChevronLeft,
  Settings2,
  MapPin,
  IndianRupee,
  Activity,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { getTurfById, updateTurf } from "../../services/firebase/turfService";
import { uploadImageToCloudinary } from "../../services/cloudinaryService";
import { useAuth } from "../../context/AuthContext";
import { DEFAULT_TIME_SLOTS } from "../../services/firebase/constants";

export default function EditTurf() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ref = useScrollReveal();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [form, setForm] = useState({
    name: "",
    location: "",
    price: "",
    sport: "Football",
    description: "",
  });
  // images: array of { url: string, preview: string }
  const [images, setImages] = useState([]);
  const [slots, setSlots] = useState([]);

  const handleSelectAllSlots = () => setSlots([...DEFAULT_TIME_SLOTS]);
  const handleClearAllSlots = () => setSlots([]);
  const toggleSlot = (slot) => {
    if (slots.includes(slot)) {
      setSlots(slots.filter(s => s !== slot));
    } else {
      setSlots([...slots, slot].sort((a, b) => DEFAULT_TIME_SLOTS.indexOf(a) - DEFAULT_TIME_SLOTS.indexOf(b)));
    }
  };

  useEffect(() => {
    const fetchTurf = async () => {
      try {
        const turf = await getTurfById(id);
        if (turf) {
          // Verify ownership
          if (turf.ownerUid !== user?.uid) {
            toast.error("You don't have permission to edit this turf");
            navigate("/owner/my-turfs");
            return;
          }
          setForm({
            name: turf.name,
            location: turf.location,
            price: turf.price.toString(),
            sport: turf.sport,
            description: turf.description || "",
          });
          setImages(turf.images?.map(url => ({ url, preview: url })) || []);
          setSlots(turf.availableSlots || []);
        } else {
          toast.error("Turf not found");
          navigate("/owner/my-turfs");
        }
      } catch (error) {
        console.error("Error fetching turf:", error);
        toast.error("Failed to load turf data");
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchTurf();
    }
  }, [id, user, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Limit to 5 images total
    const remaining = 5 - images.length;
    if (remaining <= 0) {
      toast.error("You can upload a maximum of 5 images.");
      return;
    }
    const filesToUpload = files.slice(0, remaining);

    setUploadingImages(true);
    try {
      const uploadedUrls = await Promise.all(
        filesToUpload.map(async (file) => {
          const url = await uploadImageToCloudinary(file);
          return { url, preview: URL.createObjectURL(file) };
        })
      );
      setImages((prev) => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully!`);
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error(err.message || "Failed to upload image. Please try again.");
    } finally {
      setUploadingImages(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.price) {
      toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      await updateTurf(id, {
        ...form,
        price: Number(form.price),
        availableSlots: slots,
        images: images.map((img) => img.url), // Only save Cloudinary URLs
      });
      toast.success("Turf updated successfully!");
      navigate("/owner/my-turfs");
    } catch (error) {
      console.error("Error updating turf:", error);
      toast.error("Failed to update turf. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute top-[20%] -left-[5%] w-[30%] h-[30%] rounded-full bg-accent/5 blur-[100px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-t-2 border-primary animate-spin mb-6" />
          <p className="text-foreground/60 font-medium animate-pulse">Retrieving venue details...</p>
        </div>
      </div>
    );
  }

  const isFormLoading = submitting || uploadingImages;

  return (
    <div ref={ref} className="min-h-screen bg-background relative overflow-hidden">
       {/* Decorative background elements */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-[20%] -left-[5%] w-[30%] h-[30%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10 max-w-4xl">
        <Link 
          to="/owner/my-turfs" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Listings
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="scroll-reveal">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              Venue Settings <Settings2 className="w-6 h-6 text-primary group-hover:rotate-45 transition-transform" />
            </h1>
            <p className="text-muted-foreground text-base max-w-md italic font-medium">
              Keep your venue information up to date to maintain your search ranking and trust among players.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-8">
            {/* General Info */}
            <div className="scroll-reveal stagger-1 glass-card p-6 md:p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="font-display font-bold text-xl text-foreground pb-4 border-b border-white/5">Venue Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Venue Name *</label>
                  <div className="relative group">
                    <input
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Premium Sports Arena"
                      className="w-full px-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all group-hover:bg-white/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Exact Location *</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      name="location"
                      required
                      value={form.location}
                      onChange={handleChange}
                      placeholder="Street, Landmark, City"
                      className="w-full pl-11 pr-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all group-hover:bg-white/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Price/Hour (₹) *</label>
                    <div className="relative group">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        name="price"
                        required
                        type="number"
                        value={form.price}
                        onChange={handleChange}
                        placeholder="1200"
                        className="w-full pl-11 pr-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all group-hover:bg-white/10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Primary Sport</label>
                    <div className="relative group">
                      <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        name="sport"
                        value={form.sport}
                        onChange={handleChange}
                        className="w-full pl-11 pr-5 py-3 rounded-2xl border border-white/10 bg-white/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer group-hover:bg-white/10"
                      >
                        {["Football", "Cricket", "Box Cricket", "Badminton", "Tennis", "Basketball"].map((s) => (
                          <option key={s} className="bg-slate-900 border-none">{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-muted-foreground mb-2 block uppercase tracking-wider">Public Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Tell players about your facility..."
                    className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-white/5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none italic leading-relaxed group-hover:bg-white/10"
                  />
                </div>
              </div>
            </div>
            
            {/* Time Slots */}
            <div className="scroll-reveal stagger-2 glass-card p-6 md:p-8 rounded-3xl border border-white/10">
              <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-6">
                <h3 className="font-display font-bold text-xl text-foreground">Availability</h3>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={handleSelectAllSlots} 
                    className="text-[10px] text-primary hover:underline font-bold uppercase tracking-widest"
                  >
                    Select All
                  </button>
                  <button 
                    type="button" 
                    onClick={handleClearAllSlots} 
                    className="text-[10px] text-muted-foreground hover:underline font-bold uppercase tracking-widest"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {DEFAULT_TIME_SLOTS.map((slot) => {
                  const isSelected = slots.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => toggleSlot(slot)}
                      className={`py-3 rounded-xl text-[10px] font-bold transition-all duration-200 ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-primary/20 scale-[1.02]"
                          : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:text-foreground"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            {/* Image Upload Area */}
            <div className="scroll-reveal stagger-2 glass-card p-6 rounded-3xl border border-white/10">
               <h3 className="font-display font-bold text-xl text-foreground pb-4 border-b border-white/5 mb-6">Venue Gallery</h3>
               
               <div className="space-y-6">
                  {/* Previews Grid */}
                  <div className="grid grid-cols-2 gap-3 min-h-[120px]">
                    {images.map((img, i) => (
                      <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                        <img src={img.preview || img.url} alt={`Turf ${i + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button
                            type="button"
                            onClick={() => handleRemoveImage(i)}
                            className="p-2 rounded-xl bg-destructive text-white hover:scale-110 transition-transform"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {images.length < 5 && (
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                        id="image-upload"
                      />
                      <label
                        htmlFor="image-upload"
                        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/10 rounded-2xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group ${uploadingImages ? "opacity-40 pointer-events-none" : ""}`}
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          {uploadingImages ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
                        </div>
                        <div>
                          <p className="text-sm text-foreground font-bold">{uploadingImages ? "Uploading..." : "Click to add photos"}</p>
                        </div>
                      </label>
                    </div>
                  )}
               </div>
            </div>

            {/* Actions */}
            <div className="scroll-reveal stagger-3 glass-card p-6 rounded-3xl border border-white/10 md:sticky md:top-8 space-y-4">
              <button
                type="submit"
                disabled={isFormLoading}
                className="w-full py-4 rounded-2xl font-black text-sm bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate("/owner/my-turfs")}
                className="w-full py-4 rounded-2xl font-bold text-sm bg-white/5 border border-white/10 text-foreground hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
