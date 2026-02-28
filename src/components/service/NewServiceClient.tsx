"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CategoryAutocomplete from "@/components/service/CategoryAutocomplete";
import CountrySelect from "@/components/common/CountrySelect";
import MapPickerClient from "@/components/common/MapPickerClient";
import MultiUploader from "@/components/common/MultiUploader";
import { uploadToR2 } from "@/lib/r2";
type Step = 1 | 2 | 3 | 4;

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 64);
}

export default function NewServiceClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  // Basic
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState(""); // مخفي؛ يتولد تلقائيًا
  const [shortDesc, setShortDesc] = useState("");

  // Media
  const [logoUrl, setLogoUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);

  // Node (الاسم تلقائي = اسم الخدمة؛ لا حقول ظاهرة)
  const nodeName = useMemo(() => displayName || "Main branch", [displayName]);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState<string>("");

  const [geo, setGeo] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  // Socials -> meta_json
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [youtube, setYoutube] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Categories (slugs)
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);

  // توليد slug تلقائيًا من اسم الخدمة
  useEffect(() => {
    const s = slugify(displayName || "");
    setSlug(s);
  }, [displayName]);

async function handleUpload(file: File, setter: (u: string) => void) {
  try {
    const url = await uploadToR2(file);
    setter(url);
  } catch (e: any) {
    alert(e?.message || "Upload failed");
  }
}


  async function submit() {
    try {
      setLoading(true);
      setMsg("");

      if (!displayName.trim()) {
        setMsg("Please enter a display name.");
        setLoading(false);
        return;
      }
      if (!country) {
        setMsg("Please choose a country.");
        setLoading(false);
        return;
      }

      const payload = {
        display_name: displayName,
        slug, // مخفي — يتولد تلقائيًا
        group: "service", // مهم ليتوافق مع services_group_check
        short_description: shortDesc || undefined,
        logo_url: logoUrl || undefined,
        avatar_url: avatarUrl || undefined,
        cover_url: coverUrl || undefined,
        gallery_urls: gallery && gallery.length ? gallery : undefined,

        // node (الاسم = اسم الخدمة)
        node_name: nodeName,
        address: address || undefined,
        city: city || undefined,
        country: country || undefined,

        geo_lat: geo.lat, // تُحدّد من الخريطة
        geo_lng: geo.lng,

        // meta_json
        website,
        facebook,
        instagram,
        twitter,
        tiktok,
        youtube,
        whatsapp,
        phone,
        email,

        category_slugs: categorySlugs, // array
      };

      const r = await fetch("/api/services/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(j.error || "Failed to create service");
        setLoading(false);
        return;
      }
      router.push(`/s/${j.service_slug}?created=1`);
    } catch (err: any) {
      setMsg(err?.message || "Failed");
      setLoading(false);
    }
  }

  function Stepper() {
    return (
      <div className="flex items-center gap-2 text-sm mb-4">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`px-3 py-1 rounded-full border ${
              step === n
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700"
            }`}
          >
            Step {n}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Create a new service</h1>
          <p className="text-sm text-slate-600 mb-4">
            Add your business details, media, first location, categories and social links.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (document.referrer) history.back();
              else router.push("/me/service");
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      <Stepper />

      {msg && (
        <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2">
          {msg}
        </div>
      )}

      {/* STEP 1: Basic + Categories */}
      {step === 1 && (
        <div className="card p-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm">Display name *</span>
              <input
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ex: Cuddly Pets Clinic"
              />
            </label>

            {/* slug مخفي */}
            <input type="hidden" value={slug} readOnly />
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm">Short description</span>
            <textarea
              className="input min-h-24"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              placeholder="Up to ~240 chars"
            />
          </label>

          <CategoryAutocomplete
            value={categorySlugs}
            onChange={setCategorySlugs}
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Media + Gallery */}
      {step === 2 && (
        <div className="card p-4 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Uploader
              label="Logo"
              value={logoUrl}
              onChange={setLogoUrl}
              onUpload={handleUpload}
            />
            <Uploader
              label="Avatar"
              value={avatarUrl}
              onChange={setAvatarUrl}
              onUpload={handleUpload}
            />
            <Uploader
              label="Cover"
              value={coverUrl}
              onChange={setCoverUrl}
              onUpload={handleUpload}
            />
          </div>

          <MultiUploader value={gallery} onChange={setGallery} />

          <div className="flex justify-between">
            <button
              type="button"
              className="btn"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setStep(3)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: First location (Country dropdown + Map only) */}
      {step === 3 && (
        <div className="card p-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Address"
              value={address}
              onChange={setAddress}
              placeholder="Street & number"
            />

            {/* Country dropdown فقط */}
            <div>
              <span className="block text-sm mb-1">Country *</span>
              <CountrySelect
                value={country || undefined}
                onChange={(c) => setCountry(c || "")}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input label="City" value={city} onChange={setCity} />
            {/* الإحداثيات للقراءة فقط */}
            <div>
              <div className="text-sm mb-1">Coordinates (read-only)</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  placeholder="Lat"
                  value={geo.lat ?? ""}
                  readOnly
                />
                <input
                  className="input"
                  placeholder="Lng"
                  value={geo.lng ?? ""}
                  readOnly
                />
              </div>
            </div>
          </div>

          <MapPickerClient value={geo} onChange={setGeo} />

          <div className="flex justify-between">
            <button
              type="button"
              className="btn"
              onClick={() => setStep(2)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => setStep(4)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Socials & Submit */}
      {step === 4 && (
        <div className="card p-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Website" value={website} onChange={setWebsite} />
            <Input label="Email" value={email} onChange={setEmail} />
            <Input label="Phone" value={phone} onChange={setPhone} />
            <Input label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
            <Input label="Facebook" value={facebook} onChange={setFacebook} />
            <Input
              label="Instagram"
              value={instagram}
              onChange={setInstagram}
            />
            <Input label="Twitter (X)" value={twitter} onChange={setTwitter} />
            <Input label="TikTok" value={tiktok} onChange={setTiktok} />
            <Input label="YouTube" value={youtube} onChange={setYoutube} />
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              className="btn"
              onClick={() => setStep(3)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading}
              onClick={submit}
            >
              {loading ? "Saving..." : "Create service"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-slate-700">{label}</span>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function Uploader({
  label,
  value,
  onChange,
  onUpload,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUpload: (file: File, setter: (u: string) => void) => Promise<void>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="border rounded-lg p-3">
      <div className="text-sm mb-2">{label}</div>
      {value ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="w-full h-28 object-cover rounded"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => ref.current?.click()}
            >
              Replace
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onChange("")}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="btn w-full"
          onClick={() => ref.current?.click()}
        >
          Upload {label}
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await onUpload(f, onChange);
        }}
      />
    </div>
  );
}
