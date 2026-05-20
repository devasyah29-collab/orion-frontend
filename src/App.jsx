import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, ImageIcon, UploadCloud, Video, User, 
  CheckCircle2, Wand2, Copy, Mic, AlignLeft, ChevronDown,
  Loader2, Download, Clapperboard, ExternalLink, ChevronRight,
  Camera, Eye, Focus, BookOpen, TrendingUp, AlertCircle, X
} from 'lucide-react';

// URL Backend Vercel Anda yang sudah ter-deploy secara online
const BACKEND_URL = "https://orion-backend-flame.vercel.app/api/gemini";

const fetchWithRetry = async (url, options, retries = 5) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (i === retries - 1) throw new Error(`HTTP error! status: ${response.status}`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
};

const getStyleDirective = (style) => {
  switch (style) {
    case 'POV HAND REVIEW':
      return "Gaya POV (Point of View) FIRST PERSON POV LOCK AKTIF: Sudut pandang orang pertama mutlak. Kamera bertindak sebagai mata pengguna. Tangan WAJIB terlihat memegang produk di depan lensa (foreground dominan). DILARANG KERAS menggunakan third-person shot, kamera eksternal, atau shot tanpa tangan.";
    case 'COMMERCIAL':
      return "Gaya Commercial Studio (COMMERCIAL FOCUS LOCK AKTIF): Orientasi penjualan (high clarity & product-centric). Produk WAJIB menjadi fokus utama (center atau rule of thirds), tidak tertutup elemen lain. Framing stabil dan informatif (close-up untuk detail, medium shot penggunaan). Lighting terang, clean, dan merata. Background sederhana, rapi, dan tidak distraktif. DILARANG KERAS menggunakan handheld berlebihan, gaya cinematic artistik, atau shadow gelap.";
    case 'CINEMATIC LOOK':
      return "Gaya Cinematic (CINEMATIC VISUAL LOCK AKTIF): Estetika film dramatis dengan komposisi profesional yang clean. Framing wajib stabil (tripod atau smooth cinematic movement), medium/wide shot. Pencahayaan terkontrol artistik (soft shadow, depth, kontras seimbang). Gunakan depth of field (background blur terkontrol) untuk menciptakan pemisahan jelas antara subjek dan background. DILARANG KERAS menggunakan gaya casual, vlog, selfie, POV handheld, atau framing spontan.";
    case 'UGC':
    case 'UGC / Authentic':
      return "Gaya UGC (User Generated Content): Natural, organik, sedikit handheld shake/kasual. Seakan direkam menggunakan kamera smartphone oleh kreator konten di kehidupan nyata. (Jika di depan cermin, pastikan framing realistis bergaya mirror selfie dengan device yang dipegang erat).";
    case 'UGC Storytelling':
      return "Gaya UGC Storytelling: Natural, organik, bergaya vlog naratif. Sangat fokus pada penceritaan emosional dengan tone relatable dan natural. Delivery santai.";
    case 'Mirror Story':
      return "Gaya Mirror Story: Estetika personal dan introspektif. Fokus utama pada interaksi model dengan refleksi di cermin (mirror selfie style). Framing cermin menjadi elemen utama komposisi. Ekspresi natural, kamera statis atau handheld ringan. Environment statis dan minim variasi visual.";
    case 'Vlog Style':
      return "Gaya Vlog Style (VLOG STYLE ENGINE & POV HANDHELD LOCK AKTIF): Rekaman harian self-recording murni (model memegang kamera sendiri sejauh lengan/arm-length distance). Framing close-up hingga medium shot dengan angle natural asimetris. Wajib terlihat indikasi lengan/tangan memegang kamera. DILARANG KERAS menggunakan third-person shot, tripod statis, framing terlalu rapi, atau kamera terlalu jauh.";
    default:
      return `Gaya Visual: ${style}`;
  }
};

const NO_TEXT_POLICY = "No Overlay Text Policy: no text, no subtitle, no watermark, clean visual, only product label allowed. Dilarang keras ada teks tambahan, caption, atau logo (kecuali label asli produk).";

const getBackgroundMotionDirective = (env, mode, style) => {
  if (mode === 'model-only' && style !== 'Vlog Style') {
    return "[STATIC ENVIRONMENT LOCK] Background statis sempurna, stabil, and konsisten penuh di seluruh scene. TIDAK ADA pergerakan tambahan.";
  }

  let baseMotion = "";
  const envLower = env.toLowerCase();

  if (envLower.includes('cfd') || envLower.includes('pedestrian')) {
    baseMotion = "Orang berjalan santai, pelari, atau sepeda lewat berlalu-lang secara natural di background.";
  } else if (envLower.includes('cafe')) {
    baseMotion = "Aktivitas ringan, pengunjung duduk berbincang secara blur di kejauhan, atau barista bergerak ringan.";
  } else if (envLower.includes('teras') || envLower.includes('taman') || envLower.includes('outdoor')) {
    baseMotion = "Gerakan halus alam seperti daun tanaman berayun tertiup angin ringan, dan pergeseran cahaya matahari natural (dappled light shift).";
  } else if (envLower.includes('mobil')) {
    baseMotion = "Pemandangan jalan dan pohon bergerak dengan motion blur ringan dari luar kaca jendela.";
  } else if (envLower.includes('gym')) {
    baseMotion = "Aktivitas halus orang berolahraga blur di latar belakang kejauhan.";
  } else {
    baseMotion = "Lingkungan indoor cenderung statis tanpa aktivitas manusia tambahan di background. Hanya ada sedikit efek atmosferik atau pencahayaan natural.";
  }

  return `[ENVIRONMENT-BASED MOTION BEHAVIOR] Auto-Motion Preset AKTIF. Perilaku Spesifik Background: ${baseMotion} ATURAN KETAT: Seluruh pergerakan latar WAJIB bersifat subtle (sangat halus), berada HANYA di layer belakang (secondary layer) menggunakan shallow depth of field (sedikit blur). Tidak boleh mencuri fokus dari subjek/produk utama. Validasi: Natural background activity, consistent environment, not distracting, background movement only. Kepadatan aktivitas dan mood background WAJIB konsisten di seluruh scene (tidak boleh tiba-tiba sepi lalu ramai).`;
};

const CustomAlert = ({ message, type = 'error', onClose }) => {
  if (!message) return null;
  const bgClass = type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400';
  
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl border flex items-center gap-3 shadow-lg backdrop-blur-md animate-in slide-in-from-top-4 fade-in ${bgClass}`}>
      <AlertCircle size={18} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70 transition-opacity"><X size={16} /></button>
    </div>
  );
};

const SceneCard = ({ scene, globalIdentity, config, handleDownloadImage, uploadedFiles, selectedMode, scenesDataRef }) => {
  const [customVisual, setCustomVisual] = useState(`${scene.prompt}`);
  const [script, setScript] = useState(scene.desc || '');
  const [videoPrompt, setVideoPrompt] = useState('');
  
  const [localImageUrl, setLocalImageUrl] = useState(scene.imageUrl);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [cardError, setCardError] = useState('');

  const activeBgMotion = (selectedMode === 'model-only' && config.style === 'Vlog Style') ? 'subtle' : 'static';

  const getLockedModel = () => {
    if (selectedMode === 'product-only' || !globalIdentity?.modelDetails || globalIdentity.modelDetails.faceAndHair === 'T/A') {
      return "Tanpa Model Manusia (Hanya Tangan jika POV)";
    }
    const { faceAndHair, wardrobeTop, wardrobeBottom, accessories, facingDirection, interactionStyle } = globalIdentity.modelDetails;
    let base = `${faceAndHair}, memakai ${wardrobeTop} dan ${wardrobeBottom}, ${accessories}`;
    if (facingDirection && facingDirection !== 'T/A' && interactionStyle && interactionStyle !== 'T/A') {
      base += `, Arah Wajah: ${facingDirection}, Gaya Interaksi: ${interactionStyle}`;
    }
    return base;
  };

  const getLockedProduct = () => {
    if (selectedMode === 'model-only' || !globalIdentity?.productDetails || globalIdentity.productDetails.shapeAndColor === 'T/A') return "T/A";
    const { shapeAndColor, materialAndTexture } = globalIdentity.productDetails;
    return `${shapeAndColor}, ${materialAndTexture}`;
  };

  const getLockedEnv = () => {
    if (!globalIdentity?.environmentDetails) return "T/A";
    const { settingAndProps, lightingAndMood } = globalIdentity.environmentDetails;
    return `${settingAndProps}, ${lightingAndMood}`;
  };

  const getLockedAnchor = () => {
    if (!globalIdentity?.environmentAnchor) return "";
    const { layout, dominantColors, lightingDirection, keyProps } = globalIdentity.environmentAnchor;
    return `[ENVIRONMENT ANCHOR SYSTEM] Layout: ${layout}. Warna Dominan: ${dominantColors}. Arah Cahaya: ${lightingDirection}. Properti Kunci: ${keyProps}. VALIDASI: Parameter Anchor ini 100% STATIS, absolut, dan terkunci tanpa perubahan struktur, perspektif dasar, atau lokasi antar scene.`;
  };

  const getLockedMotionLayer = () => {
    if (!globalIdentity?.motionLayer || activeBgMotion === 'static') return "";
    const { dynamicElements, motionLockConstraint } = globalIdentity.motionLayer;
    return `[MOTION LAYER & LOCK CONSTRAINT] Elemen Bergerak: ${dynamicElements}. Batasan: ${motionLockConstraint}. VALIDASI: Pergerakan HANYA pada elemen sekunder. Dilarang memicu perubahan kepadatan drastis atau merusak Environment Anchor.`;
  };

  const getLockedDevice = () => {
    if (!globalIdentity?.deviceDetails || globalIdentity.deviceDetails.typeAndColor === 'T/A') return "";
    return `IDENTITAS DEVICE (MIRROR SELFIE LOCK): ${globalIdentity.deviceDetails.typeAndColor} (Wajib dipegang model menghadap cermin).`;
  };

  const getLockedMirror = () => {
    if (!globalIdentity?.mirrorDetails || globalIdentity.mirrorDetails.frameAndStyle === 'T/A') return "";
    return `[MIRROR SCENE LOCK] Atribut Cermin: ${globalIdentity.mirrorDetails.frameAndStyle}. Refleksi, posisi cermin, dan isi background dalam pantulan WAJIB mengacu sepenuhnya pada Environment Anchor tanpa perubahan.`;
  };

  const getLockedRules = () => {
    return globalIdentity?.rules?.visual || NO_TEXT_POLICY;
  };

  const generateVideoPrompt = () => {
    if (!globalIdentity) return "Identitas global belum terbentuk.";

    const finalScript = script.trim() !== '' ? script.trim() : (scene.desc || 'Menampilkan aksi secara natural tanpa dialog spesifik.');
    const activeStyleDirective = getStyleDirective(config.style);

    let prompt = `Video sinematik, rasio aspek ${config.aspectRatio}.\n\n`;
    
    prompt += `[VOICE OVER / NARASI]\n`;
    prompt += `Voice over: "${finalScript}"\n`;
    
    if (selectedMode === 'model-only') {
      prompt += `(Pastikan emosi, ekspresi wajah, dan alur adegan model merepresentasikan kuat narasi penceritaan ini secara visual).\n\n`;
    } else if (selectedMode === 'model-product' && config.style !== 'POV HAND REVIEW') {
      prompt += `(Pastikan visual, gerakan, dan emosi model secara akurat mencerminkan nada narasi ini).\n\n`;
    } else {
      prompt += `(Pastikan tempo visual dan interaksi produk selaras dengan narasi).\n\n`;
    }

    prompt += `[CONSISTENCY ENGINE & ENVIRONMENT ANCHOR SYSTEM]\n`;
    if (selectedMode !== 'product-only') prompt += `IDENTITAS SUBJEK: ${getLockedModel()}.\n`;
    if (selectedMode !== 'model-only') prompt += `IDENTITAS PRODUK: ${getLockedProduct()}.\n`;
    
    prompt += `LOKASI TERKUNCI: ${getLockedEnv()}.\n`;
    
    const lockedAnchor = getLockedAnchor();
    if (lockedAnchor) prompt += `${lockedAnchor}\n`;

    const lockedMotionLayer = getLockedMotionLayer();
    if (lockedMotionLayer) prompt += `${lockedMotionLayer}\n`;
    prompt += `${getBackgroundMotionDirective(config.environment, selectedMode, config.style)}\n`;
    
    const lockedDevice = getLockedDevice();
    if (lockedDevice) prompt += `${lockedDevice}\n`;
    const lockedMirror = getLockedMirror();
    if (lockedMirror) prompt += `${lockedMirror}\n`;
    prompt += `\n`;
    
    prompt += `[ATURAN VISUAL KETAT]\n${getLockedRules()}\n\n`;
    
    prompt += `[ARAHAN GAYA VISUAL]\n${activeStyleDirective}\n\n`;
    
    if (selectedMode === 'model-only') {
      if (config.style === 'UGC Storytelling') {
        prompt += `[MANDATORY CAMERA RULE]\nModel looking directly at camera, direct eye contact, UGC style, handheld natural framing. Wajah harus selalu terlihat berkomunikasi dengan penonton.\n\n`;
      } else if (config.style === 'Mirror Story') {
        prompt += `[MANDATORY CAMERA RULE]\nKamera berfokus pada pantulan cermin (mirror selfie style). Kamera statis atau handheld ringan. Tone personal dan introspektif.\n\n`;
      } else if (config.style === 'Vlog Style') {
        prompt += `[VLOG POV HANDHELD LOCK RULE]\nSelf Recording Simulation AKTIF (forcePOV = true, disableExternalCamera = true): Model wajib memegang kamera sendiri sejauh lengan (arm-length distance, cameraPOV = handheld_arm_length). Sudut natural asimetris, eye contact langsung ke lensa. Wajib mengandung elemen visual lengan/tangan memegang kamera. Dilarang third-person shot atau tripod kaku. Wajib sertakan instruksi ini: "self recording, holding camera, handheld POV, arm length perspective, vlog style, natural framing, slight handheld feel". Vlog Consistency Lock aktif (perspektif sama persis di semua scene).\n\n`;
      }
    }

    if (selectedMode !== 'model-only') {
      prompt += `[ENVIRONMENT CONSISTENCY LOCK]\nLatar belakang wajib konsisten secara layout, lighting, dan warna di seluruh scene. Terapkan Environment-Based Motion Behavior: pergerakan sekunder sesuai lokasi (subtle, background only). Kepadatan aktivitas tidak boleh berubah drastis antar scene.\n\n`;
      prompt += `[PRODUCT IDENTITY LOCK]\nParameter aktif: productLock = true, preserveLabel = true, disableTextGenerationOnProduct = true. Produk adalah FIXED ASSET (berdasarkan productMasterReference di scene awal). Seluruh elemen visual produk (nama brand, tulisan, logo, warna, bentuk) WAJIB identik dan tidak boleh berubah. DILARANG reinterpretasi atau regenerasi teks pada produk. Wajib sertakan instruksi eksplisit: "preserve exact product label, no text alteration, maintain original packaging, accurate brand representation, no distortion".\n\n`;
    }

    if (config.style === 'COMMERCIAL') {
      prompt += `[COMMERCIAL FOCUS LOCK RULE]\nParameter aktif: productFocusLock = true, highClarityMode = true, disableCinematicMood = true. Produk wajib menjadi fokus utama, tidak tertutup/kalah oleh elemen lain. Framing stabil, informatif (close-up/medium shot). Lighting terang, clean, merata (high clarity). Background sederhana dan konsisten. Wajib mengandung instruksi eksplisit: "product focus, clear visibility, clean lighting, commercial shot, high clarity, no distractions". DILARANG framing terlalu dramatis, blur berlebihan yang menutupi produk, atau gaya cinematic/vlog.\n\n`;
    }
    
    if (config.style === 'CINEMATIC LOOK') {
      prompt += `[MANDATORY CINEMATIC RULE]\nCinematic Visual Lock AKTIF (cinematicLock = true, disableHandheld = true, filmLook = true). Wajib menyertakan instruksi ini secara eksplisit: "cinematic framing, stable camera, film look, shallow depth of field, controlled lighting, professional composition". Kamera harus sangat stabil (tripod/smooth cinematic), framing rapi terarah (medium/wide shot). DILARANG KERAS bergaya self-recording, POV handheld, shaky, atau casual vlog.\n\n`;
    }

    if (config.style === 'POV HAND REVIEW') {
      prompt += `[MANDATORY POV HANDHELD LOCK RULE]\nFirst Person POV Lock AKTIF (firstPersonPOV = true, handsVisible = true, disableExternalCamera = true). Kamera WAJIB berposisi sebagai mata pengguna. Tangan HARUS selalu terlihat memegang produk secara dominan di depan lensa (foreground product focus). Framing close-up hingga medium close-up dengan slight tilt dan natural micro movement. DILARANG KERAS menggunakan third-person shot, tripod feel, atau frame tanpa tangan. Wajib sertakan instruksi eksplisit: "first person POV, hands holding product, close to camera, foreground product focus, natural hand movement, user perspective". Pastikan produk tidak blur dan tidak tertutup tangan secara berlebihan.\n\n`;
    }
    
    if (config.environment === 'Teras Rumah Tropis Minimalis (Gaya Perumahan Mewah)') {
      prompt += `[MANDATORY TROPICAL TERRACE RULE]\nWajib berlokasi di teras outdoor mewah, BUKAN studio polos, BUKAN indoor tertutup. Wajib ada tanaman tropis (palem/monstera), lantai natural (batu alam/kayu), dinding bersih, dan furniture outdoor minimalis. Lighting natural warm daylight. Ambience clean & premium.\n\n`;
    }
    
    prompt += `[AKSI & KAMERA - VARIASI SCENE 0${scene.id}]\n${customVisual}.\n\n`;
    
    prompt += `INSTRUKSI KONTINUITAS KETAT: Environment Anchor System & Product Identity Lock aktif. Latar belakang HANYA boleh memiliki motion layer ringan jika Vlog Mode, selebihnya statis murni tanpa mengubah struktur Anchor. Visual harus 100% bersih dari teks overlay. Mahakarya fotorealistis, mendetail, resolusi 8k.`;
    
    return prompt;
  };

  useEffect(() => {
    const newVideoPrompt = generateVideoPrompt();
    setVideoPrompt(newVideoPrompt);
    
    if (scenesDataRef) {
      scenesDataRef.current[scene.id] = {
        customAction: customVisual,
        script,
        videoPrompt: newVideoPrompt
      };
    }
  }, [customVisual, script, globalIdentity, config, selectedMode]);

  const copyPrompt = () => {
    const textArea = document.createElement("textarea");
    textArea.value = videoPrompt;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(textArea);
  };

  const handleRegenerateImage = async () => {
    if (!globalIdentity) return;
    setIsRegenerating(true);
    setCardError('');
    
    try {
      // MENGARAHKAN LANGSUNG KE BACKEND VERCEL DENGAN PARAMETER MODEL GAMBAR
      const imageUrlEndpoint = `${BACKEND_URL}?model=gemini-2.5-flash-image-preview`;
      const activeStyleDirective = getStyleDirective(config.style);
      
      let strictImagePrompt = `INSTRUKSI KRITIS: Buat gambar fotorealistis yang dengan KETAT mematuhi identitas global permanen ini untuk memastikan kontinuitas yang sempurna antar frame video:
      
      [SISTEM PENGUNCI ATRIBUT & GLOBAL BACKGROUND CONSISTENCY SYSTEM]\n`;

      if (selectedMode !== 'model-only') {
        strictImagePrompt += `--- PRODUK ---
      Bentuk & Warna: ${globalIdentity.productDetails?.shapeAndColor}
      Material & Tekstur: ${globalIdentity.productDetails?.materialAndTexture}\n\n`;
      }

      strictImagePrompt += `--- ENVIRONMENT DETAILS ---
      Lokasi Dasar: ${globalIdentity.environmentDetails?.settingAndProps}
      Mood Dasar: ${globalIdentity.environmentDetails?.lightingAndMood}\n`;

      const lockedAnchor = getLockedAnchor();
      if (lockedAnchor) {
        strictImagePrompt += `\n--- ENVIRONMENT ANCHOR SYSTEM (100% STATIS & TERKUNCI) ---
      ${lockedAnchor}\n`;
      }

      const lockedMotionLayer = getLockedMotionLayer();
      if (lockedMotionLayer) {
        strictImagePrompt += `\n--- MOTION LAYER (DINAMIS SEKUNDER) ---
      ${lockedMotionLayer}
      Arahan Gerak Latar: ${getBackgroundMotionDirective(config.environment, selectedMode, config.style)}\n`;
      } else {
        strictImagePrompt += `\n--- ENVIRONMENT MOTION ---
      Arahan Gerak Latar: ${getBackgroundMotionDirective(config.environment, selectedMode, config.style)}\n`;
      }

      if (globalIdentity.deviceDetails && globalIdentity.deviceDetails.typeAndColor !== 'T/A') {
        strictImagePrompt += `
      --- DEVICE (MIRROR SELFIE LOCK) ---
      Properti HP: ${globalIdentity.deviceDetails.typeAndColor}
      Posisi: Selalu dipegang di tangan model menghadap cermin secara realistis.\n`;
      }
      
      if (globalIdentity.mirrorDetails && globalIdentity.mirrorDetails.frameAndStyle !== 'T/A') {
        strictImagePrompt += `
      ${getLockedMirror()}\n`;
      }
      
      strictImagePrompt += `
      --- ATURAN VISUAL KETAT ---
      ${getLockedRules()} Visual harus 100% bersih dari teks overlay.\n`;
      
      strictImagePrompt += `
      --- PENGARAHAN GAYA VISUAL KETAT ---
      ${activeStyleDirective}\n`;

      if (selectedMode === 'model-only' || (selectedMode === 'model-product' && config.style !== 'POV HAND REVIEW')) {
        strictImagePrompt += `
      --- MODEL TERKUNCI ---
      Wajah/Rambut: ${globalIdentity.modelDetails?.faceAndHair}
      Pakaian Atas: ${globalIdentity.modelDetails?.wardrobeTop}
      Pakaian Bawah: ${globalIdentity.modelDetails?.wardrobeBottom}
      Aksesoris: ${globalIdentity.modelDetails?.accessories}
      Fokus Komposisi: ${config.composition}\n`;
      } else {
        strictImagePrompt += `\nFokus Komposini: Produk Utama (Product Focus)\n`;
      }
      
      if (selectedMode === 'model-only') {
        if (config.style === 'UGC Storytelling') {
          strictImagePrompt += `
      [MANDATORY UGC CAMERA RULE]
          Model looking at camera, direct eye contact, UGC style, handheld natural framing. Wajah HARUS terlihat jelas menghadap lensa. Dilarang keras membelakangi kamera.\n`;
        } else if (config.style === 'Mirror Story') {
          strictImagePrompt += `
      [MANDATORY MIRROR STORY RULE]
          Kamera berfokus pada pantulan cermin (mirror selfie style). Cermin menjadi elemen framing utama. Kamera statis atau handheld ringan. Tone introspektif dan personal.\n`;
        } else if (config.style === 'Vlog Style') {
          strictImagePrompt += `
      [MANDATORY VLOG POV HANDHELD LOCK]
          Parameter aktif: selfRecording = true, cameraPOV = handheld_arm_length, forcePOV = true, disableExternalCamera = true. Model memegang kamera sendiri sejauh lengan (arm-length distance, holding camera). Wajib terlihat indikasi lengan memegang kamera. Sudut natural asimetris. DILARANG third-person shot atau tripod. Wajib mengandung: "self recording, holding camera, handheld POV, arm length perspective, vlog style, natural framing, slight handheld feel".\n`;
        }
      }

      if (selectedMode !== 'model-only') {
        strictImagePrompt += `
      [ENVIRONMENT CONSISTENCY LOCK]
      Latar belakang WAJIB stabil dan konsisten. Layout, pencahayaan, dan komposisi 100% identik antar scene. Aktivitas background sekunder diatur otomatis sesuai Environment-Based Motion Behavior, WAJIB subtle dan blur.\n`;
        
        strictImagePrompt += `
      [PRODUCT IDENTITY LOCK]
      Parameter aktif: productLock = true, preserveLabel = true, disableTextGenerationOnProduct = true. Produk adalah FIXED ASSET. Jaga keaslian penuh: "preserve exact product label, no text alteration, maintain original packaging, accurate brand representation, no distortion". DILARANG MERUBAH TEKS, LOGO, ATAU BENTUK PRODUK DARI REFERENSI ASLI.\n`;
      }

      if (config.style === 'COMMERCIAL') {
        strictImagePrompt += `
      [COMMERCIAL FOCUS LOCK RULE]
      Parameter aktif: productFocusLock = true, highClarityMode = true, disableCinematicMood = true. Produk wajib menjadi fokus utama yang sangat jelas (clear visibility), tidak tertutup, tidak kalah fokus dari model/background. Lighting terang, clean, merata. Wajib menggunakan parameter: "product focus, clear visibility, clean lighting, commercial shot, high clarity, no distractions". DILARANG framing dramatis, blur berlebihan pada produk, atau background distraktif.\n`;
      }

      if (config.style === 'CINEMATIC LOOK') {
        strictImagePrompt += `
      [MANDATORY CINEMATIC RULE]
      Cinematic Visual Lock AKTIF (cinematicLock = true, disableHandheld = true, filmLook = true). Wajib menggunakan parameter: "cinematic framing, stable camera, film look, shallow depth of field, controlled lighting, professional composition". Komposisi rapi, pencahayaan artistik terkontrol, background blur untuk dimensi. DILARANG KERAS gaya casual, POV handheld, selfie, shaky, atau pencahayaan flat.\n`;
      }

      if (config.style === 'POV HAND REVIEW') {
        strictImagePrompt += `
      [MANDATORY POV HANDHELD LOCK RULE]
      Parameter aktif: firstPersonPOV = true, handsVisible = true, disableExternalCamera = true. Kamera adalah mata pengguna. Tangan WAJIB terlihat memegang produk di foreground. Wajib menggunakan parameter: "first person POV, hands holding product, close to camera, foreground product focus, natural hand movement, user perspective". DILARANG KERAS third-person shot, tripod feel, atau menyembunyikan tangan. Produk harus sangat jelas terlihat.\n`;
      }

      if (config.environment === 'Teras Rumah Tropis Minimalis (Gaya Perumahan Mewah)') {
        strictImagePrompt += `
      [MANDATORY TROPICAL TERRACE RULE]
      Wajib berlokasi di teras outdoor mewah. DILARANG KERAS merender studio polos atau indoor tertutup. Wajib ada tanaman tropis (palem/monstera), lantai natural (batu alam/kayu), dinding bersih, dan kursi/meja outdoor minimalis. Lighting natural warm daylight. Ambience clean & premium.\n`;
      }

      if (config.environment === 'Pedestrian Walkway (Suasana Sudirman CFD)') {
        strictImagePrompt += `
      [MANDATORY SUDIRMAN CFD RULE]
      Wajib berlokasi di jalan raya tanpa kendaraan bermotor (Car Free Day). Background gedung perkantoran tinggi modern (Jakarta/Sudirman vibe). Suasana pagi hari (morning light). DILARANG KERAS menampilkan mobil, motor, suasana malam, atau arsitektur klasik.\n`;
      }

      strictImagePrompt += `
      [AKSI SCENE SAAT INI]
      ${customVisual}
      
      VALIDASI KETAT: ENVIRONMENT ANCHOR SYSTEM AKTIF. Deteksi otomatis perbedaan struktur layout atau lighting: JANGAN mengubah lokasi, struktur ruangan, posisi properti utama, warna dominan ruangan, atau arah cahaya (koreksi kembali ke Anchor). HANYA ubah pose, sudut kamera (sesuai aksi), dan pergerakan sekunder di motionLayer. Rasio aspek: ${config.aspectRatio}.`;

      const parts = [{ text: strictImagePrompt }];
      if (selectedMode === 'model-product' && uploadedFiles.modelBase64 && uploadedFiles.productBase64 && config.style !== 'POV HAND REVIEW') {
        parts.push({ inlineData: { mimeType: uploadedFiles.modelMime, data: uploadedFiles.modelBase64 } });
        parts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
      } else if (selectedMode === 'model-only' && uploadedFiles.modelBase64) {
        parts.push({ inlineData: { mimeType: uploadedFiles.modelMime, data: uploadedFiles.modelBase64 } });
      } else if (uploadedFiles.productBase64) {
        parts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
      }

      const payload = {
        contents: [{ parts }],
        generationConfig: { responseModalities: ['IMAGE'] }
      };

      const imgRes = await fetchWithRetry(imageUrlEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const imgData = await imgRes.json();
      
      if (imgData.error) {
        setCardError(`API Error: ${imgData.error.message || 'Gagal merender ulang'}`);
        setTimeout(() => setCardError(''), 5000);
        return;
      }

      const base64 = imgData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

      if (base64) {
        setLocalImageUrl(`data:image/png;base64,${base64}`);
        scene.imageUrl = `data:image/png;base64,${base64}`;
      } else {
        setCardError("Gagal merender ulang, AI tidak mengembalikan gambar.");
        setTimeout(() => setCardError(''), 5000);
      }
    } catch (error) {
      console.error(error);
      setCardError('Terjadi kesalahan saat merevisi gambar.');
      setTimeout(() => setCardError(''), 5000);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden group hover:border-slate-600 transition-all shadow-lg flex flex-col h-full relative">
      <CustomAlert message={cardError} onClose={() => setCardError('')} />
      
      <div className={`${config.aspectRatio === '16:9' ? 'aspect-video' : config.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[9/16]'} bg-[#0f172a] relative border-b border-slate-700 overflow-hidden shrink-0`}>
        {localImageUrl ? (
          <img src={localImageUrl} alt={`Scene ${scene.id}`} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
            <ImageIcon size={32} className="mb-2 opacity-50" />
            <span className="text-xs uppercase tracking-widest font-mono">Image Failed</span>
          </div>
        )}
        
        {isRegenerating && (
          <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <Loader2 className="text-yellow-400 w-8 h-8 animate-spin mb-2" />
            <span className="text-xs font-bold text-yellow-400 tracking-widest uppercase">Merender...</span>
          </div>
        )}

        <div className="absolute top-3 left-3 bg-[#0f172a]/80 backdrop-blur-md px-2.5 py-1 rounded text-xs font-mono font-bold text-yellow-400 border border-yellow-400/30 z-20 flex gap-2">
          <span>SCENE 0{scene.id}</span>
        </div>
        <button onClick={() => handleDownloadImage(localImageUrl, scene.id)} disabled={!localImageUrl || isRegenerating} className="absolute top-3 right-3 bg-[#0f172a]/80 backdrop-blur-md p-2 rounded text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400 hover:text-[#0f172a] transition-colors disabled:opacity-0 shadow-lg z-20">
          <Download size={16} />
        </button>
      </div>

      <div className="p-5 flex-grow flex flex-col space-y-5 bg-slate-800/20">
        
        <div className="space-y-2">
          <label className="flex items-center justify-between text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Clapperboard size={14} /> 1. Kustomisasi Aksi & Kamera</span>
            <span className="text-[9px] bg-yellow-400/20 px-2 py-0.5 rounded text-yellow-400 border border-yellow-400/30 flex items-center gap-1">
              <Focus size={10}/> {selectedMode === 'product-only' || config.style === 'POV HAND REVIEW' ? 'Product Focus' : config.composition}
            </span>
          </label>
          <textarea
            value={customVisual}
            onChange={(e) => setCustomVisual(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl p-3 text-xs text-slate-200 leading-relaxed resize-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors min-h-[60px]"
            placeholder={selectedMode === 'model-only' ? "Ganti pose, alur adegan, gaya kamera, atau emosi karakter di sini..." : "Ganti pose, gaya kamera, atau aksi di sini..."}
          />
          <button 
            onClick={handleRegenerateImage}
            disabled={isRegenerating}
            className="w-full py-2.5 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {isRegenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {isRegenerating ? 'Merender Ulang...' : 'Generate Ulang Gambar (Revisi)'}
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
            <Mic size={14} /> 2. Voice Over (Script)
          </label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl p-3 text-xs text-slate-200 leading-relaxed resize-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 outline-none transition-colors min-h-[60px]"
            placeholder="Tuliskan naskah dialog atau narasi ceritanya untuk scene ini..."
          />
        </div>

        <div className="space-y-1.5 flex-grow flex flex-col">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
            <AlignLeft size={14} /> 3. Prompt Image-to-Video
          </label>
          <div className="flex-grow bg-[#0f172a] rounded-xl border border-slate-700/50 p-3 overflow-y-auto min-h-[120px] max-h-[160px] relative">
            <pre className="text-[10px] text-slate-400 whitespace-pre-wrap font-mono leading-relaxed">{videoPrompt}</pre>
          </div>
          <button onClick={copyPrompt} className="w-full py-3 mt-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all shadow-md group">
            <Copy size={16} className="text-yellow-400 group-hover:scale-110 transition-transform" /> Salin Prompt Video
          </button>
        </div>

      </div>
    </div>
  );
};

const App = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [renderStep, setRenderStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedMode, setSelectedMode] = useState('model-product'); 
  const [showExternalPlatforms, setShowExternalPlatforms] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  
  // Custom API Key input to make it runnable
  const [apiKey, setApiKey] = useState("");
  const [appError, setAppError] = useState('');

  const [uploadedFiles, setUploadedFiles] = useState({ 
    model: null, product: null, modelBase64: null, productBase64: null, modelMime: null, productMime: null
  });
  
  const [productName, setProductName] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  
  const [config, setConfig] = useState({
    style: 'COMMERCIAL',
    composition: 'Balanced', 
    length: 4, 
    aspectRatio: '9:16',
    environment: 'Mirror Selfie di Kamar (Cermin Besar)',
    customEnvironment: ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [globalIdentity, setGlobalIdentity] = useState(null);
  const [scenes, setScenes] = useState([]);
  const scenesDataRef = useRef({});

  useEffect(() => {
    document.title = "Orion Content Studio by YourDigital.Ai";
  }, []);

  const goToStep = (step) => {
    if (step === activeStep) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setRenderStep(step);
      setActiveStep(step);
      setIsTransitioning(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 400); 
  };

  const handleProceedToUpload = () => goToStep(2);
  
  const handleProceedToStyle = () => {
    if (selectedMode === 'model-only') {
      setConfig(prev => ({ ...prev, style: 'UGC Storytelling' }));
    } else {
      setConfig(prev => ({ ...prev, style: 'COMMERCIAL' }));
    }
    goToStep(3);
  }

  const handleProceedToConfig = (selectedStyle) => {
    setConfig(prev => {
      let newConfig = { ...prev, style: selectedStyle };
      if (selectedStyle === 'POV HAND REVIEW' || selectedMode === 'product-only') {
        newConfig.composition = 'Product Focus';
      } else if (selectedMode === 'model-only') {
        newConfig.composition = 'Model Focus';
      }
      return newConfig;
    });
    goToStep(4);
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const detectProductWithAI = async (file, newUploads) => {
    if (selectedMode === 'model-only') {
      setProductName(''); 
      return;
    }

    setIsDetecting(true);
    setProductName('');
    try {
      const base64Data = newUploads.productBase64;
      
      // MENGARAHKAN LANGSUNG KE BACKEND VERCEL SECARA OTOMATIS
      const url = `${BACKEND_URL}?model=gemini-2.5-flash-preview-09-2025`;

      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: "Berikan nama produk spesifik dari gambar ini dalam bahasa Indonesia (maksimal 5 kata). Hanya kembalikan nama produknya saja tanpa tanda kutip." },
              { inlineData: { mimeType: file.type, data: base64Data } }
            ]
          }]
        })
      });

      const data = await response.json();
      
      // JIKA BACKEND MENGIRIMKAN ERROR DARI GOOGLE GEMINI
      if (data.error) {
        console.error("Gemini API Error:", data.error);
        setProductName(`Gagal: ${data.error.message || 'API Error'}`);
        setAppError(`Gemini API Error: ${data.error.message || 'Cek konfigurasi Vercel Anda.'}`);
        return;
      }

      const detectedName = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      if (detectedName) {
        setProductName(detectedName);
      } else {
        setProductName("Produk Tidak Dikenali");
      }
    } catch (error) {
      console.error(error);
      setProductName("Error Koneksi");
      setAppError("Tidak bisa menghubungi server Backend Anda. Pastikan Backend di Vercel aktif.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    const base64Data = await fileToBase64(file);
    
    const newUploads = { 
      ...uploadedFiles, [type]: imageUrl, [`${type}Base64`]: base64Data, [`${type}Mime`]: file.type
    };
    setUploadedFiles(newUploads);
    
    if (type === 'product' && selectedMode !== 'model-only') detectProductWithAI(file, newUploads);
  };

  const handleGenerateContent = async () => {
    if (!productName) return;

    if (config.environment === 'Custom (Tulis Sendiri)' && !config.customEnvironment.trim()) {
      setErrorMsg('Tolong tuliskan deskripsi custom environment Anda secara detail sebelum melanjutkan.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    setShowExternalPlatforms(false);
    setGenerationStatus('Membangun Konsistensi Identitas & Ekstraksi Environment Anchor...');
    goToStep(4.5);

    setTimeout(async () => {
      try {
        setGenerationStatus('Analisis Motion Layer & Micro-Attributes...');
        
        // MENGGUNAKAN BACKEND DINAMIS UNTUK TEKS
        const textUrl = `${BACKEND_URL}?model=gemini-2.5-flash-preview-09-2025`;
        
        const environmentDirectives = {
          'Studio Foto Clean (Warna Earth Tone / Monokrom)': 'Studio foto profesional. Latar belakang mulus dan bersih (warna earth tone atau monokrom), pencahayaan studio yang terkontrol sempurna, minimalis.',
          'Dapur Estetik (Modern & Bersih)': 'Berada di dapur modern yang bersih. Tonjolkan meja dapur, peralatan dapur, dan pencahayaan dalam ruangan yang hangat.',
          'Di Dalam Mobil (Vibes Perjalanan Tol Jakarta)': 'Berada di dalam mobil (city car atau mewah). SANGAT PENTING: Framing sempit, subjek sedang duduk, memakai sabuk pengaman, jendela menunjukkan motion blur dari jalan tol kota.',
          'Pedestrian Walkway (Suasana Sudirman CFD)': 'Jalur pejalan kaki (jalan raya lebar tanpa kendaraan bermotor) di pagi hari saat Car Free Day. Latar belakang gedung perkantoran tinggi modern khas Sudirman Jakarta. Terdapat aktivitas pejalan kaki, pelari, atau pesepeda yang memudar (blur) di latar belakang. Pencahayaan natural pagi hari (morning light). Ambience ramai, aktif, namun tertib dan bersih.',
          'Teras Rumah Tropis Minimalis (Gaya Perumahan Mewah)': 'Teras rumah outdoor minimalis premium. Lantai batu alam/kayu outdoor, dinding putih/earth tone bersih. Terdapat tanaman tropis hijau (palem/monstera) dan furniture outdoor (kursi santai estetik/meja kecil). Pencahayaan natural daylight hangat, soft shadow. Ambience clean, mewah, dan tidak ramai.',
          'Fitting Room Mall (Pencahayaan Terang & Bersih)': 'Di dalam kamar pas (fitting room) mal. Pencahayaan dari atas yang terang dan bersih, cermin terlihat, refleksi halus, ruang tertutup.',
          'Mirror Selfie di Kamar (Cermin Besar)': 'Berada di kamar tidur pribadi minimalis. Menggunakan cermin besar (full body mirror). Karakteristik visual: Perspektif dari pantulan cermin (reflection view), model memegang smartphone menghadap cermin, interior kamar rapi terlihat di pantulan, cahaya jendela alami atau lampu warm indoor.',
          'Tabletop Lifestyle (Meja Kayu/Marble dengan Props Ringan)': 'Fokus pada permukaan meja (tabletop) kayu atau marble. Properti ringan estetik di latar belakang (seperti vas, buku, atau cangkir). Pencahayaan natural lembut dari jendela. Konteks aktivitas: unboxing, review detail produk di atas meja.',
          'Kamar Tidur (Casual, Nuansa Pagi/Malam)': 'Di dalam kamar tidur yang nyaman dan kasual. Pencahayaan lembut (sinar pagi natural atau lampu malam yang hangat). Suasana santai, personal, dan intim.',
          'Meja Kerja / Home Office (Produktif)': 'Di area meja kerja atau home office minimalis. Terdapat laptop, buku, dan alat tulis. Pencahayaan fokus (task lighting/jendela). Nuansa produktif dan profesional.',
          'Kamar Mandi / Vanity Area (Beauty/Skincare)': 'Di area vanity atau wastafel kamar mandi yang bersih dan estetik. Pencahayaan terang merata khas cermin beauty/ring light. Terdapat pantulan cermin dan tekstur keramik/marmer. Cocok untuk skincare routine.',
          'Cafe Aesthetic (Indoor/Outdoor Ambient)': 'Di sebuah kafe estetik kekinian. Elemen interior kayu, tanaman, jendela besar. Pencahayaan hangat natural, latar belakang memudar (bokeh blur) dengan nuansa keramaian santai.',
          'Taman Kota / Urban Park (Outdoor)': 'Di luar ruangan, taman kota yang asri. Tanaman hijau subur, sinar matahari alami terang, bayangan daun (dappled light), suasana segar, aktif dan terbuka.',
          'Area Gym / Fitness Space (Aktif)': 'Di dalam pusat kebugaran (gym) modern. Terdapat peralatan fitness blur di latar belakang. Pencahayaan kontras (neon atau spotlight). Suasana energik, aktif, sweat vibe.',
          'Studio Dramatic (Dark / Moody Lighting)': 'Di studio dengan set latar belakang gelap/hitam. Pencahayaan kontras tinggi (low-key lighting, rim light), bayangan tajam, dan mood yang misterius serta sangat intens.',
          'Luxury Interior (Sofa, Kaca, High-End)': 'Di dalam ruangan interior super mewah (lobi hotel atau ruang tamu elit). Sofa premium, elemen kaca, logam, dan marmer. Pencahayaan chandelier atau warm ambient. Kesan eksklusif dan mahal.',
          'Minimalist Architecture Space (Clean & Artistic)': 'Ruang arsitektur minimalis yang kosong dan sangat artistik. Dinding polos, garis geometris tajam, komposisi rapi dengan ruang negatif (negative space). Sinar matahari membentuk bayangan arsitektural dramatis.'
        };
        
        let activeEnvDirective = environmentDirectives[config.environment] || '';
        if (config.environment === 'Custom (Tulis Sendiri)') {
          activeEnvDirective = `[CUSTOM USER LOKASI] ${config.customEnvironment}. Ekstrak lokasi, pencahayaan, mood, dan properti detail dari deskripsi ini secara akurat.`;
        }

        let activeCompDirective = '';
        if (selectedMode === 'product-only') {
           activeCompDirective = 'Fokus absolut pada detail produk dan estetikanya di dalam lingkungan yang dipilih.';
        } else if (selectedMode === 'model-only') {
           activeCompDirective = 'Fokus absolut pada penceritaan visual (storytelling) dengan model sebagai subjek utama.';
        } else {
           const compositionDirectives = {
            'Balanced': 'Framing seimbang antara lingkungan, subjek (jika ada), dan produk.',
            'Model Focus': 'Fokus utama framing pada model, ekspresi, postur tubuh, dan interaksinya.',
            'Product Focus': 'Fokus dominan framing pada detail produk. Harus sering menggunakan close-up atau macro shot pada produk.'
          };
          activeCompDirective = compositionDirectives[config.composition] || '';
        }

        const styleDirective = getStyleDirective(config.style);

        if (config.style === 'Mirror Story' && !config.environment.toLowerCase().includes('cermin') && !config.environment.toLowerCase().includes('mirror') && !config.environment.toLowerCase().includes('kamar mandi')) {
           activeEnvDirective += " [MIRROR STORY CORRECTION: LOKASI WAJIB MEMILIKI CERMIN ESTETIK SEBAGAI PROPERTI UTAMA UNTUK REFLEKSI].";
        }

        let deviceDirective = "- deviceDetails: Set to 'T/A' unless specific criteria are met.";
        let mirrorDirective = "- mirrorDetails: Set to 'T/A' unless specific criteria are met.";
        if ((config.style.includes('UGC') || config.style === 'UGC / Authentic' || config.style === 'Mirror Story') && (config.environment.includes('Mirror') || config.environment.includes('Cermin') || config.style === 'Mirror Story' || activeEnvDirective.includes('MIRROR STORY CORRECTION'))) {
           deviceDirective = "- deviceDetails: [DEVICE LOCKING SYSTEM] WAJIB diisi dengan 'Smartphone iPhone 13 Pro Max warna Graphite' (atau warna Silver, pilih satu warna dan KUNCI secara permanen). Wajib digunakan sebagai alat perekam refleksi di cermin.";
           mirrorDirective = "- mirrorDetails: [MIRROR ATTRIBUTE LOCKING SYSTEM] WAJIB diisi dengan detail spesifik cermin (misal: 'Cermin besar dengan frame hitam matte', 'Frame gold metal minimalis', atau 'Frameless'). Atribut ini KUNCI secara permanen untuk konsistensi refleksi.";
        }

        let workflowInstructions = "";
        let conversionEngineInstruction = ""; 
        let storytellingEngineRules = ""; 

        const activeBgMotion = (selectedMode === 'model-only' && config.style === 'Vlog Style') ? 'subtle' : 'static';

        if (selectedMode === 'model-only') {
           const phaseMapping = {
             4: "Scene 1: Hook, Scene 2: Conflict/Struggle, Scene 3: Turning Point, Scene 4: Resolution & Soft CTA",
             8: "Scene 1: Hook, Scene 2-3: Conflict, Scene 4-5: Struggle, Scene 6: Turning Point, Scene 7: Resolution, Scene 8: Soft CTA",
             12: "Scene 1-2: Hook, Scene 3-5: Conflict, Scene 6-8: Struggle, Scene 9: Turning Point, Scene 10-11: Resolution, Scene 12: Soft CTA"
           };

           let internalEmotionAndTone = "";
           let cameraStyleRules = "";

           if (config.style === 'UGC Storytelling') {
             internalEmotionAndTone = "Tone relatable, ekspresi natural, delivery santai namun engaging.";
             cameraStyleRules = "- Hook: Direct to camera\n- Conflict/Struggle: Sedikit variasi angle natural\n- Resolution: Kembali ke direct to camera yang santai.";
           } else if (config.style === 'Mirror Story') {
             internalEmotionAndTone = "Tone introspektif, tenang, ekspresi personal. Lingkungan statis dan minim variasi visual.";
             cameraStyleRules = "- Hook & Seterusnya: Kamera statis berfokus pada pantulan cermin (mirror selfie). Frame cermin sebagai jangkar utama.";
           } else if (config.style === 'Vlog Style') {
             internalEmotionAndTone = "Tone casual, conversational, santai (seperti berbicara dengan teman). Dinamis namun terkontrol dengan murni self-recording perspective.";
             cameraStyleRules = "- Semua Fase (Hook -> CTA): POV Handheld Lock. Self-recording simulation (model memegang kamera sendiri, arm-length distance, sebagian lengan terlihat). Variasi angle dinamis tapi natural asimetris, eye contact langsung ke lensa. DILARANG third-person shot atau tripod statis.";
           }

           storytellingEngineRules = `
        [1. STORY STRUCTURE ENGINE]
        Kamu WAJIB membagi adegan ke dalam 6 fase utama: Hook -> Conflict -> Struggle -> Turning Point -> Resolution -> Soft CTA.
        Distribusi untuk ${config.length} scene adalah: ${phaseMapping[config.length]}.
        Transisi antar scene harus terasa natural dan membentuk satu cerita yang utuh (bukan sekadar urutan visual yang terputus).

        [2. INTERNAL STYLE & TONE CONTROL (VISUAL STYLE PRESET)]
        Karakteristik Gaya '${config.style}': ${internalEmotionAndTone}
        SISTEM KETAT: Secara otomatis terapkan emosi dan tone ini secara progresif sesuai fase cerita. DILARANG menggunakan gaya sinematik kaku atau tone yang melenceng dari preset ini.

        [3. CAMERA STYLE VARIATION]
        Gunakan variasi gaya kamera secara logis yang didistribusikan sesuai preset:
        ${cameraStyleRules}
        [VALIDASI INTERNAL KAMERA]: PENTING! Variasi kamera TIDAK BOLEH bertentangan dengan LOKASI (environment) yang terkunci. Jika di dalam mobil, gunakan variasi angle dari bangku penumpang/dashboard, DILARANG walking talk.
        [KONSISTENSI VISUAL]: Seluruh variasi gaya kamera HANYA mengubah posisi/angle framing. Latar belakang ruangan dan environment tetap terikat pada Global Background Consistency System.
           `;

           workflowInstructions = `[STORYTELLING WORKFLOW] PENTING: DILARANG KERAS MENCANTUMKAN PRODUK FISIK APAPUN! Fokus 100% pada ekspresi model, narasi kehidupan, aktivitas keseharian yang mencerminkan tema: "${productName}". Set productDetails sepenuhnya ke 'T/A'. Rancang adegan menggunakan Story Structure Engine di bawah ini.`;
           if (config.style === 'UGC Storytelling') {
             workflowInstructions += `\n[ATURAN KETAT UGC STORYTELLING]: Di SELURUH scene, model WAJIB selalu menghadap kamera (direct-to-camera framing). Pertahankan eye contact, framing frontal atau slight angle ke kamera, dan gesture komunikasi langsung. DILARANG KERAS menampilkan adegan model membelakangi kamera secara penuh. Background dikunci statis.`;
           } else if (config.style === 'Mirror Story') {
             workflowInstructions += `\n[ATURAN KETAT MIRROR STORY]: Model WAJIB berinteraksi dengan cermin. Framing harus memperlihatkan pantulan cermin sebagai elemen utama komposisi. Tone lebih personal/introspektif dengan ekspresi natural. Kamera statis atau handheld ringan. Jika di environment tidak ada cermin, WAJIB asumsikan dan kunci properti cermin estetik di lokasi tersebut. Background dikunci statis.`;
           } else if (config.style === 'Vlog Style') {
             workflowInstructions += `\n[VLOG POV HANDHELD LOCK - STRICT RULES]:
        - Camera Behavior: 'handheld_arm_length' dengan parameter selfRecording = true, forcePOV = true, disableExternalCamera = true. Kamera sebagai perpanjangan tangan model. Wajib terlihat sebagian tangan memegang kamera. Framing close-up/medium shot, sedikit tilt/micro-shake natural. DILARANG third-person shot, tripod, atau framing cinematic rapi. Wajib menginjeksi prompt visual eksplisit: "self recording, holding camera, handheld POV, arm length perspective, vlog style, natural framing, slight handheld feel".
        - Tone Komunikasi: 'casual_conversational'. Voice over santai (clean script), seperti berbicara ke teman.
        - Environment Flex: 'controlled'. Lokasi TERKUNCI di satu tempat.
        - Vlog Consistency Lock: Semua scene harus mempertahankan perspektif self-recording POV yang sama tanpa berpindah ke sudut orang ketiga.
        - Background Motion: Wajib 'subtle' (internal logic berdasarkan environment).
        - Validasi Internal: Deteksi jika framing terlalu jauh atau tanpa indikasi handheld, otomatis koreksi ke POV vlog selfie.`;
           }
        } else {
           if (selectedMode === 'product-only') {
             workflowInstructions = `[PRODUCT WORKFLOW] Set modelDetails ke 'T/A'. Fokus 100% pada keindahan dan detail produk.\n[ENVIRONMENT-BASED MOTION BEHAVIOR] Terapkan pergerakan background otomatis sesuai environment (subtle layer). Layout dan mood tetap terkunci.`;
           } else {
             workflowInstructions = `[MODEL + PRODUCT WORKFLOW] Interaksi harmonis antara subjek model dan produk.\n[ENVIRONMENT-BASED MOTION BEHAVIOR] Terapkan pergerakan background otomatis sesuai environment (subtle layer). Layout dan mood tetap terkunci.`;
           }

           workflowInstructions += `\n[PRODUCT IDENTITY LOCK]: Parameter aktif (productLock = true, preserveLabel = true, disableTextGenerationOnProduct = true). Produk adalah FIXED ASSET. Jadikan scene 1 sebagai productMasterReference. Seluruh elemen visual produk (nama brand, teks kemasan, logo, warna, bentuk) WAJIB identik di seluruh scene. DILARANG reinterpretasi teks. Wajib injeksi: "preserve exact product label, no text alteration, maintain original packaging, accurate brand representation, no distortion".`;
           
           if (config.style === 'COMMERCIAL') {
               workflowInstructions += `\n[COMMERCIAL FOCUS LOCK]: Parameter aktif (productFocusLock = true, highClarityMode = true, disableCinematicMood = true). Produk WAJIB menjadi fokus utama di setiap scene, tidak boleh tertutup, kalah fokus, atau terlalu kecil. Framing stabil (close-up/medium shot). Lighting terang, clean, merata. Background wajib sederhana, rapi, no distractions. Narasi wajib langsung menyorot fitur, manfaat, dan selling point (high-conversion). Wajib injeksi: "product focus, clear visibility, clean lighting, commercial shot, high clarity, no distractions".`;
           }
           
           conversionEngineInstruction = `
        [CONVERSION NARRATIVE ENGINE - HIGH CONVERSION MODE AKTIF (conversionGoal = true)]
        - SELURUH narasi (voice over/desc) WAJIB didesain untuk HIGH-CONVERSION SELLING.
        - STRUKTUR STORYTELLING (Progresif antar scene dari awal ke akhir): Hook (Menarik perhatian) -> Problem (Pain point audiens) -> Solution (Produk sbg solusi) -> Benefit (Keunggulan utama) -> CTA (Call to Action yang jelas).
        - GAYA PENYAMPAIAN (VOICE OVER) WAJIB SELARAS DENGAN VISUAL STYLE (${config.style}):
          * UGC / Authentic: Narasi natural, relatable, direct to camera, seolah kreator memberi testimoni jujur.
          * Commercial Studio: Jelas, profesional, to the point, sangat fokus pada spesifikasi, fitur & benefit.
          * Cinematic Look: Emosional, dramatis, menggugah perasaan (mood-driven) namun bermuara kuat pada value produk.
          * POV Hand Review: Deskriptif, demonstratif, fokus memandu penonton melihat interaksi, tekstur, dan sensasi pemakaian produk.
        - DILARANG membuat output yang terlalu storytelling abstrak tanpa arah jualan. Pain point target audience and keunggulan produk WAJIB ditekankan di dalam naskah secara rapi.`;
        }

        const cleanVoiceOverRule = `
        [CLEAN VOICE OVER STANDARD - MANDATORY (cleanScript = true)]
        - DILARANG KERAS menggunakan label, prefix, bracket, atau deskripsi visual pada field 'desc' (CONTOH SALAH: "Hook: ...", "Scene 1: ...", "Narration:", "[Narasi] ...", "VO: ...").
        - DILARANG mencampurkan narasi dengan penjelasan adegan di dalam field 'desc'.
        - Output 'desc' HANYA BOLEH berisi kalimat natural murni yang siap disuarakan. Struktur cerita atau format emosi/selling wajib diimplementasikan secara implisit di dalam kalimat, BUKAN dalam format label.`;

        const directorPromptText = `You are an ELITE AI video director. Your absolute priority is VISUAL CONTINUITY and adhering to the requested Style and Composition. 
        
        STEP 1: IDENTITY & ENVIRONMENT LOCKDOWN. Extract MICRO-ATTRIBUTES to define 'globalIdentity'. 
        - modelDetails: Face features, hair, exact top clothing, bottom clothing, accessories, facingDirection, interactionStyle. (IMPORTANT: If selectedMode is product-only OR style is 'POV HAND REVIEW', set faceAndHair to 'T/A', wardrobeTop to 'T/A', wardrobeBottom to 'T/A', accessories to 'T/A'). (IF selectedMode is 'model-only' AND style is 'UGC Storytelling', YOU MUST SET facingDirection to 'Menghadap kamera (Direct-to-camera)' and interactionStyle to 'Direct address / Eye contact').
        - productDetails: Exact shape, color codes, textures, labels, orientation. (IMPORTANT: If selectedMode is model-only, set shapeAndColor to 'T/A', materialAndTexture to 'T/A').
        - environmentDetails: Absolute lighting direction, mood, and background setting. [DIRECTIVE: ${activeEnvDirective}]
        - environmentAnchor: [ENVIRONMENT ANCHOR SYSTEM] Tentukan layout dasar lokasi, warna dominan, arah cahaya utama, dan posisi properti kunci. Ini bersifat 100% statis dan absolut, tidak boleh ada perubahan layout, struktur ruangan, atau pemindahan lokasi antar scene.
        - motionLayer: [MOTION LAYER] Tentukan elemen sekunder apa saja yang boleh bergerak berdasarkan preset internal. Berikan constraint ketat bahwa elemen bergerak HANYA berada di layer background (shallow DoF) dan dilarang merusak atau mengubah Environment Anchor (hindari perubahan kepadatan/perspektif drastis). WAJIB sesuai dengan environment-based motion behavior.
        ${deviceDirective}
        ${mirrorDirective}
        - rules.visual: [NO OVERLAY TEXT POLICY] WAJIB diisi dengan teks ini: "${NO_TEXT_POLICY}"
        
        STEP 2: STORYBOARD DESIGN. Create ${config.length} scenes. 
        - Scene 1 is the MASTER REFERENCE.
        - Scenes 2-${config.length} vary ONLY in action, pose, and camera angle, BUT STRICTLY WITHIN THE EXACT SAME LOCATION ANCHOR.
        
        [STRATEGI VISUAL KETAT - MANDATORY]
        - ${workflowInstructions}
        ${storytellingEngineRules}
        - ${styleDirective}
        - Komposisi Framing: ${activeCompDirective}
        - ${NO_TEXT_POLICY}
        ${conversionEngineInstruction}
        ${cleanVoiceOverRule}
        
        [GLOBAL BACKGROUND CONSISTENCY & ANCHOR SYSTEM - MANDATORY]
        - Latar belakang (environment) WAJIB dijaga konsistensinya 100% di seluruh scene menggunakan Environment Anchor System.
        - Hanya layer aktivitas sekunder (motionLayer) yang boleh berubah (seperti daun tertiup angin ringan, orang lewat di kejauhan dengan blur). Struktur visual utama, properti kunci, dan warna TIDAK BOLEH BERUBAH.
        - ${getBackgroundMotionDirective(config.environment, selectedMode, config.style)}
        - [MIRROR SCENE LOCK]: Jika environment melibatkan cermin (Mirror Selfie), maka refleksi, bentuk cermin, posisi cermin, ukuran, dan isi background yang terlihat di pantulan WAJIB mengacu pada Environment Anchor yang sama persis tanpa distorsi.
        - The 'prompt' for each scene MUST NOT describe a new setting. Only describe the subject's action, camera movement, and the subtle motion layer activity.
        
        STRICT VALIDATION RULES:
        - Wardrobe and Environment Anchor MUST NOT change between scenes. Deteksi & koreksi perbedaan layout!
        - Scene 'desc' must be engaging INDONESIAN voiceover contextually tied to the locked environment, style, and workflow directive.
        - Scene 'prompt' must focus ONLY on the camera/action in INDONESIAN, maintaining the GLOBAL BACKGROUND CONSISTENCY SYSTEM explicitly.`;

        const textParts = [{ text: directorPromptText }];
        
        if (selectedMode === 'model-product' && uploadedFiles.modelBase64 && uploadedFiles.productBase64) {
          textParts.push({ inlineData: { mimeType: uploadedFiles.modelMime, data: uploadedFiles.modelBase64 } });
          textParts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
        } else if (selectedMode === 'model-only' && uploadedFiles.modelBase64) {
          textParts.push({ inlineData: { mimeType: uploadedFiles.modelMime, data: uploadedFiles.modelBase64 } });
        } else if (uploadedFiles.productBase64) {
          textParts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
        }

        const promptRes = await fetchWithRetry(textUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: textParts }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  globalIdentity: {
                    type: "OBJECT",
                    properties: {
                      modelDetails: {
                        type: "OBJECT",
                        properties: { faceAndHair: { type: "STRING" }, wardrobeTop: { type: "STRING" }, wardrobeBottom: { type: "STRING" }, accessories: { type: "STRING" }, facingDirection: { type: "STRING" }, interactionStyle: { type: "STRING" } },
                        required: ["faceAndHair", "wardrobeTop", "wardrobeBottom", "accessories", "facingDirection", "interactionStyle"]
                      },
                      productDetails: {
                        type: "OBJECT",
                        properties: { shapeAndColor: { type: "STRING" }, materialAndTexture: { type: "STRING" } },
                        required: ["shapeAndColor", "materialAndTexture"]
                      },
                      environmentDetails: {
                        type: "OBJECT",
                        properties: { settingAndProps: { type: "STRING" }, lightingAndMood: { type: "STRING" } },
                        required: ["settingAndProps", "lightingAndMood"]
                      },
                      environmentAnchor: {
                        type: "OBJECT",
                        properties: { layout: { type: "STRING" }, dominantColors: { type: "STRING" }, lightingDirection: { type: "STRING" }, keyProps: { type: "STRING" } },
                        required: ["layout", "dominantColors", "lightingDirection", "keyProps"]
                      },
                      motionLayer: {
                        type: "OBJECT",
                        properties: { dynamicElements: { type: "STRING" }, motionLockConstraint: { type: "STRING" } },
                        required: ["dynamicElements", "motionLockConstraint"]
                      },
                      deviceDetails: {
                        type: "OBJECT",
                        properties: { typeAndColor: { type: "STRING" } },
                        required: ["typeAndColor"]
                      },
                      mirrorDetails: {
                        type: "OBJECT",
                        properties: { frameAndStyle: { type: "STRING" } },
                        required: ["frameAndStyle"]
                      },
                      rules: {
                        type: "OBJECT",
                        properties: { visual: { type: "STRING" } },
                        required: ["visual"]
                      }
                    },
                    required: ["modelDetails", "productDetails", "environmentDetails", "environmentAnchor", "motionLayer", "deviceDetails", "mirrorDetails", "rules"]
                  },
                  scenes: {
                    type: "ARRAY",
                    items: {
                      type: "OBJECT",
                      properties: { desc: { type: "STRING" }, prompt: { type: "STRING" } },
                      required: ["desc", "prompt"]
                    }
                  }
                },
                required: ["globalIdentity", "scenes"]
              }
            }
          })
        });

        const promptData = await promptRes.json();
        
        if (promptData.error) {
          throw new Error(`API Error: ${promptData.error.message || 'Gagal generate teks'}`);
        }

        const rawText = promptData.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const resultObj = JSON.parse(cleanedText);
        
        const generatedGlobalIdentity = resultObj.globalIdentity;
        
        const generatedScenes = resultObj.scenes.map(s => {
          let finalDesc = s.desc.replace(/^(Hook|Problem|Solution|Benefit|CTA|Conflict|Tensi|Resolution|Klimaks|Narasi|Narration|Voice Over|Voiceover|VO|Scene\s*\d+)[\s]*[:\-]\s*/gi, '')
                                .replace(/\[.*?\]/g, '') 
                                .replace(/\*.*?\*/g, '') 
                                .trim();
          
          let finalPrompt = s.prompt;
          const isMirror = generatedGlobalIdentity.environmentDetails?.settingAndProps.toLowerCase().includes('cermin') || generatedGlobalIdentity.environmentDetails?.settingAndProps.toLowerCase().includes('mirror') || config.environment.includes('Mirror');
          
          let lockString = `[ENVIRONMENT ANCHOR SYSTEM: Latar belakang WAJIB 100% statis mematuhi Anchor (Layout, Properti Kunci, Cahaya Dominan). HANYA motionLayer sekunder yang boleh bergerak. DILARANG mengubah perspektif lokasi drastis atau merusak struktur ruangan.]`;
          
          if (isMirror) {
             lockString += ` [MIRROR SCENE LOCK: Refleksi dan pantulan cermin WAJIB mengacu pada Environment Anchor yang sama tanpa distorsi]`;
          }

          if (!finalPrompt.includes('ENVIRONMENT ANCHOR SYSTEM')) {
             finalPrompt = `${finalPrompt.trim()} ${lockString}`;
          }

          if (selectedMode !== 'model-only') {
             const motionLock = `[ENVIRONMENT CONSISTENCY LOCK: Layout, lighting, warna identik. Pergerakan background diatur oleh Environment-Based Motion Behavior (natural background activity, consistent environment, not distracting, background movement only). Bebas dari perubahan drastis.]`;
             if (!finalPrompt.includes('ENVIRONMENT CONSISTENCY LOCK')) {
             finalPrompt = `${finalPrompt.trim()} ${motionLock}`;
          }
       }

       if (selectedMode !== 'model-only') {
          const productLockStr = `[PRODUCT IDENTITY VALIDATION: preserve exact product label, no text alteration, maintain original packaging, accurate brand representation, no distortion. Produk = FIXED ASSET. Deteksi & Koreksi: Kembalikan teks dan bentuk produk agar identik 100% dengan referensi awal jika ada distorsi]`;
          if (!finalPrompt.includes('PRODUCT IDENTITY VALIDATION')) {
             finalPrompt = `${finalPrompt.trim()} ${productLockStr}`;
          }
       }

       if (config.style === 'COMMERCIAL') {
          const commercialLock = `[COMMERCIAL VALIDATION: product focus, clear visibility, clean lighting, commercial shot, high clarity, no distractions. Deteksi & Koreksi: Produk TIDAK BOLEH terlalu kecil, tertutup, atau kalah fokus dari model/background. NO dramatic mood, NO shaky cam. Kamera harus stabil dan terang merata.]`;
          if (!finalPrompt.includes('COMMERCIAL VALIDATION')) {
             finalPrompt = `${finalPrompt.trim()} ${commercialLock}`;
          }
       }

       if (config.style === 'CINEMATIC LOOK') {
          const cinematicLock = `[CINEMATIC VALIDATION: cinematic framing, stable camera, film look, shallow depth of field, controlled lighting, professional composition. NO handheld, NO selfie, NO casual vlog style, NO flat lighting. Kamera statis/stabil, framing rapi dan terarah.]`;
          if (!finalPrompt.includes('CINEMATIC VALIDATION')) {
             finalPrompt = `${finalPrompt.trim()} ${cinematicLock}`;
          }
       }

       if (config.style === 'POV HAND REVIEW') {
          const povLock = `[POV VALIDATION: first person POV, hands holding product, close to camera, foreground product focus, natural hand movement, user perspective. Deteksi & Koreksi: Kamera WAJIB bertindak sebagai mata pengguna. Tangan HARUS terlihat memegang produk di foreground. NO third-person shot. NO tripod. Produk tidak boleh blur.]`;
          if (!finalPrompt.includes('POV VALIDATION')) {
             finalPrompt = `${finalPrompt.trim()} ${povLock}`;
          }
       }

          if (selectedMode === 'model-only' && config.style === 'Vlog Style') {
             const vlogLock = `[VLOG POV VALIDATION: self recording, holding camera, handheld POV, arm length perspective, vlog style, natural framing, slight handheld feel. Tangan model terlihat memegang kamera, eye contact ke lensa. NO third-person shot. NO tripod.]`;
             if (!finalPrompt.includes('VLOG POV VALIDATION')) {
                finalPrompt = `${finalPrompt.trim()} ${vlogLock}`;
             }
          }

          if (config.environment === 'Teras Rumah Tropis Minimalis (Gaya Perumahan Mewah)') {
             const tropicalLock = `[TROPICAL TERRACE CORRECTION: Wajib berlokasi di teras outdoor mewah, BUKAN studio polos, BUKAN indoor. Wajib ada tanaman tropis (palem/monstera), lantai batu alam/kayu, dinding bersih, dan kursi/meja outdoor. Lighting natural warm daylight. Ambience clean & premium]`;
             if (!finalPrompt.includes('TROPICAL TERRACE CORRECTION')) {
                finalPrompt = `${finalPrompt.trim()} ${tropicalLock}`;
             }
          }

          if (config.environment === 'Pedestrian Walkway (Suasana Sudirman CFD)') {
             const cfdLock = `[SUDIRMAN CFD CORRECTION: Wajib berlokasi di jalan raya lebar tanpa kendaraan bermotor (Car Free Day). Background gedung perkantoran tinggi modern khas Jakarta. Suasana pagi hari (morning light). Ada pejalan kaki/pelari/pesepeda. DILARANG KERAS ada mobil/motor, DILARANG suasana malam/sore, arsitektur harus modern]`;
             if (!finalPrompt.includes('SUDIRMAN CFD CORRECTION')) {
                finalPrompt = `${finalPrompt.trim()} ${cfdLock}`;
             }
          }

          return { ...s, desc: finalDesc, prompt: finalPrompt };
        });

        setGlobalIdentity(generatedGlobalIdentity);
        
        // MENGGUNAKAN BACKEND DINAMIS UNTUK GAMBAR
        const imageUrlEndpoint = `${BACKEND_URL}?model=gemini-2.5-flash-image-preview`;
        const finalScenes = [];
        const processScenes = generatedScenes.slice(0, config.length);

        for (let i = 0; i < processScenes.length; i++) {
          const scene = processScenes[i];
          setGenerationStatus(`Rendering Scene 0${i + 1} (Kontinuitas Identitas)...`);
          
          let strictImagePrompt = `INSTRUKSI KRITIS: Buat gambar fotorealistis dengan KONTINUITAS SEMPURNA dari identitas global terkunci ini:
          
          [SISTEM KONTINUITAS VISUAL & ENVIRONMENT ANCHOR SYSTEM]\n`;

          if (selectedMode !== 'model-only') {
            strictImagePrompt += `--- PRODUK ---
          Visual Fisik: ${generatedGlobalIdentity.productDetails.shapeAndColor}
          Tekstur/Bahan: ${generatedGlobalIdentity.productDetails.materialAndTexture}\n\n`;
          }
          
          strictImagePrompt += `--- ENVIRONMENT DETAILS ---
          Lokasi Dasar: ${generatedGlobalIdentity.environmentDetails.settingAndProps}
          Mood Dasar: ${generatedGlobalIdentity.environmentDetails.lightingAndMood}
          Konteks Lingkungan Asli: ${activeEnvDirective}\n`;

          if (generatedGlobalIdentity.environmentAnchor) {
            strictImagePrompt += `\n--- ENVIRONMENT ANCHOR SYSTEM (100% STATIS & TERKUNCI) ---
          Layout Lokasi: ${generatedGlobalIdentity.environmentAnchor.layout}
          Warna Dominan: ${generatedGlobalIdentity.environmentAnchor.dominantColors}
          Arah Cahaya: ${generatedGlobalIdentity.environmentAnchor.lightingDirection}
          Properti Kunci: ${generatedGlobalIdentity.environmentAnchor.keyProps}
          VALIDASI ANCHOR: Layout, struktur ruangan, posisi objek utama, dan pencahayaan dasar bersifat absolut statis. Tidak boleh ada perubahan lokasi atau pemindahan properti antar scene.\n`;
          }

          if (generatedGlobalIdentity.motionLayer && activeBgMotion !== 'static') {
            strictImagePrompt += `\n--- MOTION LAYER (DINAMIS SEKUNDER) ---
          Elemen Bergerak: ${generatedGlobalIdentity.motionLayer.dynamicElements}
          Constraint Batasan: ${generatedGlobalIdentity.motionLayer.motionLockConstraint}
          Arahan Gerak Latar: ${getBackgroundMotionDirective(config.environment, selectedMode, config.style)}
          VALIDASI MOTION: Pergerakan HANYA pada elemen sekunder di kedalaman gambar (shallow depth of field). DILARANG mengubah kepadatan, perspektif, atau merusak struktur Anchor.\n`;
          }

          if (generatedGlobalIdentity.deviceDetails && generatedGlobalIdentity.deviceDetails.typeAndColor !== 'T/A') {
            strictImagePrompt += `
          --- DEVICE (MIRROR SELFIE LOCK) ---
          Properti HP: ${generatedGlobalIdentity.deviceDetails.typeAndColor}
          Posisi: Selalu dipegang di tangan model menghadap cermin secara realistis.\n`;
          }

          if (generatedGlobalIdentity.mirrorDetails && generatedGlobalIdentity.mirrorDetails.frameAndStyle !== 'T/A') {
            strictImagePrompt += `
          --- MIRROR SCENE LOCK ---
          Spesifikasi: ${generatedGlobalIdentity.mirrorDetails.frameAndStyle}
          Karakteristik: Refleksi, warna frame, material, posisi cermin, dan seluruh isi pantulan ruangan WAJIB mengacu pada Environment Anchor yang sama tanpa distorsi sedikitpun.\n`;
          }

          strictImagePrompt += `
          --- ATURAN VISUAL KETAT ---
          ${generatedGlobalIdentity.rules?.visual || NO_TEXT_POLICY} Visual harus 100% bersih dari teks overlay.\n`;

          strictImagePrompt += `
          --- ARAHAN GAYA KETAT ---
          ${styleDirective}\n`;

          if (selectedMode === 'model-only' || (selectedMode === 'model-product' && config.style !== 'POV HAND REVIEW')) {
            strictImagePrompt += `
          --- MODEL TERKUNCI ---
          Wajah/Rambut: ${generatedGlobalIdentity.modelDetails.faceAndHair}
          Outfit Atas: ${generatedGlobalIdentity.modelDetails.wardrobeTop}
          Outfit Bawah: ${generatedGlobalIdentity.modelDetails.wardrobeBottom}
          Aksesoris: ${generatedGlobalIdentity.modelDetails.accessories}
          Fokus Komposisi: ${config.composition}\n`;
          }

          if (selectedMode === 'model-only') {
            if (config.style === 'UGC Storytelling') {
              strictImagePrompt += `
          [MANDATORY UGC CAMERA RULE]
          Model looking at camera, direct eye contact, UGC style, handheld natural framing. Wajah HARUS terlihat jelas menghadap lensa. Dilarang keras membelakangi kamera.\n`;
            } else if (config.style === 'Mirror Story') {
              strictImagePrompt += `
          [MANDATORY MIRROR STORY RULE]
          Kamera berfokus pada pantulan cermin (mirror selfie style). Cermin menjadi elemen framing utama. Kamera statis atau handheld ringan. Tone introspektif dan personal.\n`;
            } else if (config.style === 'Vlog Style') {
              strictImagePrompt += `
          [MANDATORY VLOG POV HANDHELD LOCK]
          Self Recording = true, forcePOV = true, disableExternalCamera = true. Model memegang kamera sendiri (arm-length distance, holding camera). Wajib terlihat indikasi lengan memegang kamera. Sudut natural asimetris. DILARANG third-person shot atau tripod. Wajib mengandung: "self recording, holding camera, handheld POV, arm length perspective, vlog style, natural framing, slight handheld feel".\n`;
            }
          }

          if (selectedMode !== 'model-only') {
            strictImagePrompt += `
          [ENVIRONMENT CONSISTENCY LOCK]
          Latar belakang WAJIB stabil dan konsisten. Layout, pencahayaan, dan komposisi 100% identik antar scene. Aktivitas background sekunder diatur otomatis sesuai Environment-Based Motion Behavior, WAJIB subtle dan blur.\n`;

            strictImagePrompt += `
          [PRODUCT IDENTITY LOCK]
          Parameter aktif: productLock = true, preserveLabel = true, disableTextGenerationOnProduct = true. Produk adalah FIXED ASSET (productMasterReference). Wajib patuhi: "preserve exact product label, no text alteration, maintain original packaging, accurate brand representation, no distortion". DILARANG typo, perubahan font, atau reinterpretasi bentuk.\n`;
          }

          if (config.style === 'COMMERCIAL') {
            strictImagePrompt += `
          [COMMERCIAL FOCUS LOCK RULE]
          Parameter aktif: productFocusLock = true, highClarityMode = true, disableCinematicMood = true. Produk wajib menjadi fokus utama (jelas, tidak tertutup, komposisi dominan). Lighting terang, clean, merata. Wajib menggunakan parameter: "product focus, clear visibility, clean lighting, commercial shot, high clarity, no distractions". DILARANG framing dramatis, blur berlebihan pada produk, atau background distraktif.\n`;
          }

          if (config.style === 'CINEMATIC LOOK') {
            strictImagePrompt += `
          [MANDATORY CINEMATIC RULE]
          Cinematic Visual Lock AKTIF (cinematicLock = true, disableHandheld = true, filmLook = true). Wajib menggunakan parameter: "cinematic framing, stable camera, film look, shallow depth of field, controlled lighting, professional composition". Komposisi rapi, pencahayaan artistik terkontrol, background blur untuk dimensi. DILARANG KERAS gaya casual, POV handheld, selfie, shaky, atau pencahayaan flat.\n`;
          }

          if (config.style === 'POV HAND REVIEW') {
            strictImagePrompt += `
          [MANDATORY POV HANDHELD LOCK RULE]
          Parameter aktif: firstPersonPOV = true, handsVisible = true, disableExternalCamera = true. Kamera adalah mata pengguna. Tangan WAJIB terlihat memegang produk di foreground. Wajib menggunakan parameter: "first person POV, hands holding product, close to camera, foreground product focus, natural hand movement, user perspective". DILARANG KERAS third-person shot, tripod feel, atau menyembunyikan tangan. Produk harus sangat jelas terlihat.\n`;
          }

          if (config.environment === 'Teras Rumah Tropis Minimalis (Gaya Perumahan Mewah)') {
            strictImagePrompt += `
          [MANDATORY TROPICAL TERRACE RULE]
          Wajib berlokasi di teras outdoor mewah. DILARANG KERAS merender studio polos atau indoor tertutup. Wajib ada tanaman tropis (palem/monstera), lantai natural (batu alam/kayu), dinding bersih, dan kursi/meja outdoor minimalis. Lighting natural warm daylight. Ambience clean & premium.\n`;
          }

          if (config.environment === 'Pedestrian Walkway (Suasana Sudirman CFD)') {
            strictImagePrompt += `
          [MANDATORY SUDIRMAN CFD RULE]
          Wajib berlokasi di jalan raya tanpa kendaraan bermotor (Car Free Day). Background gedung perkantoran tinggi modern (Jakarta/Sudirman vibe). Suasana pagi hari (morning light). DILARANG KERAS menampilkan mobil, motor, suasana malam, atau arsitektur klasik.\n`;
          }

          strictImagePrompt += `
          [AKSI SCENE SAAT INI]
          ${scene.prompt}
          
          VALIDASI KETAT: ENVIRONMENT ANCHOR SYSTEM AKTIF. Deteksi otomatis perbedaan struktur layout atau lighting: JANGAN mengubah lokasi, struktur ruangan, posisi properti utama, warna dominan ruangan, atau arah cahaya (koreksi kembali ke Anchor). HANYA ubah pose, sudut kamera (sesuai aksi), dan pergerakan sekunder di motionLayer. Rasio aspek: ${config.aspectRatio}.`;

          const parts = [{ text: strictImagePrompt }];
          if (selectedMode === 'model-product' && uploadedFiles.modelBase64 && uploadedFiles.productBase64 && config.style !== 'POV HAND REVIEW') {
            parts.push({ inlineData: { mimeType: uploadedFiles.modelMime, data: uploadedFiles.modelBase64 } });
            parts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
          } else if (selectedMode === 'model-only' && uploadedFiles.modelBase64) {
            parts.push({ inlineData: { mimeType: uploadedFiles.modelMime, data: uploadedFiles.modelBase64 } });
          } else if (uploadedFiles.productBase64) {
            parts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
          }

          try {
            const imgRes = await fetchWithRetry(imageUrlEndpoint, {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } })
            });
            const imgData = await imgRes.json();
            
            if (imgData.error) {
              finalScenes.push({ id: i + 1, desc: scene.desc, prompt: scene.prompt, imageUrl: '' });
              continue;
            }

            const base64 = imgData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            finalScenes.push({ id: i + 1, desc: scene.desc, prompt: scene.prompt, imageUrl: base64 ? `data:image/png;base64,${base64}` : '' });
          } catch (imgErr) {
            finalScenes.push({ id: i + 1, desc: scene.desc, prompt: scene.prompt, imageUrl: '' });
          }
        }

        setScenes(finalScenes);
        goToStep(5);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || 'Gagal menjaga konsistensi identitas. Silakan coba lagi.');
        goToStep(4);
      } finally {
        setIsGenerating(false);
        setGenerationStatus('');
      }
    }, 500);
  };

  const handleDownloadImage = (imageUrl, sceneId) => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `scene_${sceneId}_locked.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllAssets = async () => {
    setIsZipping(true);
    try {
      const JSZipModule = await import('https://esm.sh/jszip@3.10.1');
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      const safeName = productName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'locked_campaign';
      
      let content = `=== KAMPANYE TERKUNCI (CONSISTENCY ENGINE): ${productName.toUpperCase()} ===\n\n`;
      content += `[CAMPAIGN STRATEGY]\n- Workflow Mode: ${selectedMode === 'product-only' ? 'Product Only' : selectedMode === 'model-only' ? 'Model Only (Storytelling)' : 'Model + Product'}\n- Visual Style: ${config.style}\n`;
      
      if (selectedMode === 'model-product' && config.style !== 'POV HAND REVIEW') {
        content += `- Composition Focus: ${config.composition}\n`;
        if (config.style === 'CINEMATIC LOOK') content += `- Cinematic Specific: Cinematic Lock = true, Disable Handheld = true, Film Look = true\n\n`;
        else if (config.style === 'COMMERCIAL') content += `- Commercial Specific: Product Focus Lock = true, High Clarity Mode = true, Disable Cinematic Mood = true\n\n`;
        else content += `\n`;
      } else if (selectedMode === 'model-only') {
        content += `- Composition Focus: Model Focus (Storytelling)\n`;
        if (config.style === 'Vlog Style') content += `- Vlog Specific: Self Recording = true, POV Handheld Lock = true\n\n`;
        else content += `\n`;
      } else {
        content += `- Composition Focus: Product Focus (Auto)\n`;
        if (config.style === 'CINEMATIC LOOK') content += `- Cinematic Specific: Cinematic Lock = true, Disable Handheld = true, Film Look = true\n\n`;
        else if (config.style === 'COMMERCIAL') content += `- Commercial Specific: Product Focus Lock = true, High Clarity Mode = true, Disable Cinematic Mood = true\n\n`;
        else if (config.style === 'POV HAND REVIEW') content += `- POV Specific: First Person POV = true, Hands Visible = true, Disable External Camera = true\n\n`;
        else content += `\n`;
      }
      
      const activeBgMotion = (selectedMode === 'model-only' && config.style === 'Vlog Style') ? 'subtle' : 'auto_subtle (Environment-Based)';
      content += `- Background Motion: ${activeBgMotion} (Internal Auto Preset)\n\n`;
      
      if (selectedMode !== 'model-only') {
        content += `- Product Identity Lock: True (Preserve Label, No Text Alteration, Fixed Asset)\n\n`;
      }
      
      if (globalIdentity) {
        content += `[LOCKED MICRO-ATTRIBUTES]\n`;
        if ((selectedMode === 'model-product' && config.style !== 'POV HAND REVIEW') || selectedMode === 'model-only') {
          content += `--- MODEL ---\n- Wajah: ${globalIdentity.modelDetails?.faceAndHair}\n- Atasan: ${globalIdentity.modelDetails?.wardrobeTop}\n- Bawahan: ${globalIdentity.modelDetails?.wardrobeBottom}\n- Aksesoris: ${globalIdentity.modelDetails?.accessories}\n`;
          if (globalIdentity.modelDetails?.facingDirection && globalIdentity.modelDetails?.facingDirection !== 'T/A') {
            content += `- Arah Wajah: ${globalIdentity.modelDetails.facingDirection}\n- Gaya Interaksi: ${globalIdentity.modelDetails.interactionStyle}\n`;
          }
          content += `\n`;
        }
        if (selectedMode !== 'model-only') {
          content += `--- PRODUK ---\n- Fisik: ${globalIdentity.productDetails?.shapeAndColor}\n- Tekstur: ${globalIdentity.productDetails?.materialAndTexture}\n\n`;
        }
        content += `--- LINGKUNGAN (ENVIRONMENT ANCHOR SYSTEM) ---\n- Lokasi Dasar: ${globalIdentity.environmentDetails?.settingAndProps}\n- Mood Dasar: ${globalIdentity.environmentDetails?.lightingAndMood}\n`;
        
        if (globalIdentity.environmentAnchor) {
          content += `- Layout Statis: ${globalIdentity.environmentAnchor.layout}\n- Warna Dominan: ${globalIdentity.environmentAnchor.dominantColors}\n- Arah Cahaya: ${globalIdentity.environmentAnchor.lightingDirection}\n- Properti Kunci: ${globalIdentity.environmentAnchor.keyProps}\n\n`;
        }

        if (globalIdentity.motionLayer) {
          content += `--- MOTION LAYER (DINAMIS SEKUNDER) ---\n- Elemen Bergerak: ${globalIdentity.motionLayer.dynamicElements}\n- Constraint: ${globalIdentity.motionLayer.motionLockConstraint}\n\n`;
        }

        if (globalIdentity.deviceDetails && globalIdentity.deviceDetails.typeAndColor !== 'T/A') {
          content += `--- DEVICE LOCK ---\n- Smartphone: ${globalIdentity.deviceDetails.typeAndColor}\n\n`;
        }
        
        if (globalIdentity.mirrorDetails && globalIdentity.mirrorDetails.frameAndStyle !== 'T/A') {
          content += `--- MIRROR SCENE LOCK ---\n- Spesifikasi Cermin: ${globalIdentity.mirrorDetails.frameAndStyle}\n\n`;
        }
        
        if (globalIdentity.rules && globalIdentity.rules.visual) {
          content += `--- VISUAL RULES ---\n- Policy: ${globalIdentity.rules.visual}\n\n`;
        }
      }

      scenes.forEach(scene => {
        const data = scenesDataRef.current[scene.id] || {};
        content += `--- SCENE 0${scene.id} ---\n[1. AKSI] ${data.customAction || scene.prompt}\n[2. SCRIPT] ${data.script || scene.desc}\n[3. PROMPT VIDEO] ${data.videoPrompt || 'N/A'}\n\n`;
      });
      
      zip.file(`${safeName}_Consistency_Sheet.txt`, content);
      scenes.forEach(s => {
        if (s.imageUrl) {
          const b64 = s.imageUrl.split(',')[1];
          if (b64) zip.file(`Scene_0${s.id}_${safeName}.png`, b64, { base64: true });
        }
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${safeName}_Full_Assets.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { 
      setAppError("Gagal membuat file ZIP. Pastikan library JSZip berhasil dimuat.");
      setTimeout(() => setAppError(''), 5000);
    } finally { 
      setIsZipping(false); 
    }
  };

  const handleReset = () => {
    goToStep(0);
    setTimeout(() => {
      setUploadedFiles({ model: null, product: null, modelBase64: null, productBase64: null, modelMime: null, productMime: null });
      setProductName('');
      setGlobalIdentity(null);
      setScenes([]);
      setShowExternalPlatforms(false);
      scenesDataRef.current = {};
    }, 400);
  };

  const showTextInput = (selectedMode === 'model-only' && uploadedFiles.model) || (selectedMode !== 'model-only' && uploadedFiles.product);
  const isReadyForStep3 = selectedMode === 'model-product' ? (uploadedFiles.model && uploadedFiles.product) 
                        : selectedMode === 'model-only' ? !!uploadedFiles.model 
                        : !!uploadedFiles.product;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-yellow-500/30 selection:text-yellow-200 flex flex-col overflow-x-hidden relative">
      <CustomAlert message={appError} onClose={() => setAppError('')} />
      
      <header className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.4)] cursor-pointer" onClick={handleReset}>
              <TrendingUp className="text-[#0f172a] w-6 h-6" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col cursor-pointer" onClick={handleReset}>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">
                Orion Content <span className="text-yellow-400 font-medium">Studio</span>
              </h1>
              <span className="text-[10px] font-medium text-slate-400 tracking-wider">by YourDigital.Ai</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {activeStep > 0 && (
              <div className="hidden md:flex items-center gap-3">
                {[1, 2, 3, 4, 5].map(step => {
                  const isPast = activeStep > step || (activeStep === 4.5 && step <= 4);
                  const isActive = activeStep === step;
                  const isLoadingTarget = activeStep === 4.5 && step === 5;
                  let circleClass = 'bg-slate-800 text-slate-500 border border-slate-700';
                  if (isActive) circleClass = 'bg-yellow-400 text-[#0f172a] shadow-[0_0_10px_rgba(250,204,21,0.5)]';
                  else if (isPast) circleClass = 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/50';
                  else if (isLoadingTarget) circleClass = 'bg-yellow-400/30 text-yellow-100 border border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-pulse';
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${circleClass}`}>{isPast ? <CheckCircle2 size={16} /> : step}</div>
                      {step < 5 && <div className={`w-6 h-0.5 rounded-full transition-colors duration-500 ${isPast || isLoadingTarget ? 'bg-yellow-400/50' : 'bg-slate-800'}`} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center w-full">
        <div className={`w-full flex-grow flex flex-col justify-center max-w-6xl mx-auto px-6 py-8 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isTransitioning ? 'opacity-0 translate-y-6 scale-[0.98] blur-[2px] pointer-events-none' : 'opacity-100 translate-y-0 scale-100 blur-0 pointer-events-auto'}`}>
          
          {renderStep === 0 && (
            <section className="flex flex-col items-center justify-center text-center space-y-8 min-h-[60vh] w-full max-w-4xl mx-auto">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.5)] mb-4"><TrendingUp className="text-[#0f172a] w-12 h-12" strokeWidth={2.5} /></div>
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight">Orion Content <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500">Studio</span></h2>
                <span className="text-sm md:text-base font-medium text-slate-500 tracking-widest uppercase">by YourDigital.Ai</span>
              </div>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">Ubah foto produk biasa menjadi aset iklan video berkualitas tinggi yang konsisten secara otomatis.</p>
              
              <button onClick={() => goToStep(1)} className="mt-8 px-12 py-5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full font-bold text-[#0f172a] text-xl hover:from-yellow-400 hover:to-amber-400 transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(250,204,21,0.4)] hover:scale-105"><span>Mulai Sekarang</span><Wand2 className="w-6 h-6" /></button>
            </section>
          )}

          {renderStep === 1 && (
            <section className="space-y-8 w-full max-w-5xl mx-auto">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-yellow-400 uppercase tracking-wider">Step 1: Choose Workflow</div>
                <h2 className="text-4xl font-bold text-white">Apa yang ingin Anda buat?</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div onClick={() => setSelectedMode('model-product')} className={`cursor-pointer rounded-2xl p-8 border-2 transition-all ${selectedMode === 'model-product' ? 'bg-slate-800 border-yellow-400 shadow-lg' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}>
                  <div className="flex gap-2 mb-4"><User className="text-yellow-400"/><ImageIcon className="text-yellow-400"/></div>
                  <h3 className="text-xl font-bold text-white mb-2">Model + Produk</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Visualisasikan produk yang digunakan oleh model AI secara konsisten dalam sebuah kampanye interaktif.</p>
                </div>
                
                <div onClick={() => setSelectedMode('model-only')} className={`cursor-pointer rounded-2xl p-8 border-2 transition-all ${selectedMode === 'model-only' ? 'bg-slate-800 border-yellow-400 shadow-lg' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}>
                  <div className="flex gap-2 mb-4"><BookOpen className="text-yellow-400 mb-4"/></div>
                  <h3 className="text-xl font-bold text-white mb-2">Model Only (Storytelling)</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Fokus pada penceritaan emosional (Hook, Conflict, Resolution) dengan model sebagai karakter utama tanpa upload produk.</p>
                </div>

                <div onClick={() => setSelectedMode('product-only')} className={`cursor-pointer rounded-2xl p-8 border-2 transition-all ${selectedMode === 'product-only' ? 'bg-slate-800 border-yellow-400 shadow-lg' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}>
                  <div className="flex gap-2 mb-4"><ImageIcon className="text-yellow-400 mb-4"/></div>
                  <h3 className="text-xl font-bold text-white mb-2">Produk Saja</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">Fokus pada estetika dan komposisi sinematik produk untuk showcase visual tanpa kehadiran model.</p>
                </div>
              </div>
              <div className="flex justify-end"><button onClick={handleProceedToUpload} className="px-10 py-4 bg-yellow-500 rounded-xl font-bold text-[#0f172a] hover:bg-yellow-400 transition-all flex items-center gap-2">Lanjutkan <ChevronRight size={20}/></button></div>
            </section>
          )}

          {renderStep === 2 && (
            <section className="space-y-8 w-full max-w-4xl mx-auto">
              <button onClick={() => goToStep(1)} className="text-sm text-slate-400 hover:text-yellow-400 mb-4">&larr; Kembali</button>
              <h2 className="text-4xl font-bold text-white">Unggah Aset Referensi</h2>
              <div className={`grid gap-8 ${selectedMode === 'model-product' ? 'md:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto'}`}>
                {selectedMode !== 'product-only' && (
                  <label className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${uploadedFiles.model ? 'border-yellow-400 bg-slate-900' : 'border-slate-700 hover:bg-slate-800/50'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'model')} />
                    {uploadedFiles.model ? <><img src={uploadedFiles.model} className="w-20 h-20 object-cover rounded-lg mb-2 opacity-50" alt="Model Preview"/><span className="font-bold text-yellow-400">Model Terunggah</span></> : <><UploadCloud className="mb-4 text-slate-500" size={40}/><span>Upload Model Image</span></>}
                  </label>
                )}
                {selectedMode !== 'model-only' && (
                  <label className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${uploadedFiles.product ? 'border-yellow-400 bg-slate-900' : 'border-slate-700 hover:bg-slate-800/50'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'product')} />
                    {uploadedFiles.product ? <><img src={uploadedFiles.product} className="w-20 h-20 object-contain rounded-lg mb-2 opacity-50" alt="Product Preview"/><span className="font-bold text-yellow-400">Produk Terunggah</span></> : <><ImageIcon className="mb-4 text-slate-500" size={40}/><span>Upload Product Image</span></>}
                  </label>
                )}
              </div>
              
              {showTextInput && (
                <div className={`bg-slate-800/80 p-6 rounded-2xl border border-slate-700 mt-4 ${selectedMode !== 'model-only' ? 'max-w-2xl mx-auto' : ''}`}>
                  <label className="block text-xs font-bold text-yellow-400 mb-2 uppercase tracking-widest">
                    {isDetecting ? 'Menganalisis...' : (selectedMode === 'model-only' ? 'Topik Cerita / Tema Kampanye' : 'Nama Produk')}
                  </label>
                  <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-5 py-4 text-white focus:border-yellow-400 outline-none text-lg" placeholder={selectedMode === 'model-only' ? "Cth: Menyelesaikan project penting di cafe..." : "Nama Produk..."}/>
                  <div className="mt-5 flex justify-end">
                    <button onClick={handleProceedToStyle} disabled={!isReadyForStep3 || isDetecting} className="px-8 py-3 bg-yellow-500 text-[#0f172a] font-bold rounded-xl disabled:opacity-50 transition-colors">Lanjut ke Visual Style</button>
                  </div>
                </div>
              )}
            </section>
          )}

          {renderStep === 3 && (
            <section className="space-y-8 w-full max-w-4xl mx-auto">
              <button onClick={() => goToStep(2)} className="text-sm text-slate-400 hover:text-yellow-400 mb-4">&larr; Kembali</button>
              <div className="space-y-2 text-center md:text-left mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-yellow-400 uppercase tracking-wider">Step 3: Visual Direction</div>
                <h2 className="text-4xl font-bold text-white">Pilih Visual Style</h2>
                <p className="text-slate-400">Gaya penyutradaraan ini akan diterapkan secara konsisten di seluruh scene.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {selectedMode === 'model-only' ? (
                  <>
                    <div onClick={() => handleProceedToConfig('UGC Storytelling')} className="cursor-pointer bg-slate-800/40 border border-slate-700 rounded-2xl p-6 hover:border-yellow-400 hover:bg-slate-800 transition-all flex flex-col items-center text-center group">
                      <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><User className="text-yellow-400" /></div>
                      <h3 className="text-xl font-bold text-white mb-2">UGC Storytelling</h3>
                      <p className="text-slate-400 text-sm">Organik dan personal, bergaya vlog naratif yang menonjolkan alur cerita harian karakter.</p>
                    </div>
                    <div onClick={() => handleProceedToConfig('Mirror Story')} className="cursor-pointer bg-slate-800/40 border border-slate-700 rounded-2xl p-6 hover:border-yellow-400 hover:bg-slate-800 transition-all flex flex-col items-center text-center group">
                      <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Camera className="text-yellow-400" /></div>
                      <h3 className="text-xl font-bold text-white mb-2">Mirror Story</h3>
                      <p className="text-slate-400 text-sm">Fokus pada interaksi pantulan cermin (mirror selfie). Tone introspektif, personal, dan estetik.</p>
                    </div>
                    <div onClick={() => handleProceedToConfig('Vlog Style')} className="cursor-pointer bg-slate-800/40 border border-slate-700 rounded-2xl p-6 hover:border-yellow-400 hover:bg-slate-800 transition-all flex flex-col items-center text-center group">
                      <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Video className="text-yellow-400" /></div>
                      <h3 className="text-xl font-bold text-white mb-2">Vlog Style</h3>
                      <p className="text-slate-400 text-sm">Gaya rekaman harian yang dinamis, casual, handheld, dengan tone santai dan conversational.</p>
                    </div>
                  </>
                ) : (
                  <>
                    {selectedMode === 'model-product' && (
                      <div onClick={() => handleProceedToConfig('UGC')} className="cursor-pointer bg-slate-800/40 border border-slate-700 rounded-2xl p-6 hover:border-yellow-400 hover:bg-slate-800 transition-all flex flex-col items-center text-center group">
                        <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><User className="text-yellow-400" /></div>
                        <h3 className="text-xl font-bold text-white mb-2">UGC / Authentic</h3>
                        <p className="text-slate-400 text-sm">Gaya kreator natural, organik, cocok untuk platform seperti TikTok atau Reels.</p>
                      </div>
                    )}
                    
                    <div onClick={() => handleProceedToConfig('COMMERCIAL')} className="cursor-pointer bg-slate-800/40 border border-slate-700 rounded-2xl p-6 hover:border-yellow-400 hover:bg-slate-800 transition-all flex flex-col items-center text-center group">
                      <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Camera className="text-yellow-400" /></div>
                      <h3 className="text-xl font-bold text-white mb-2">Commercial Studio</h3>
                      <p className="text-slate-400 text-sm">Pencahayaan studio yang rapi, tajam, cocok untuk katalog atau iklan profesional.</p>
                    </div>
                    
                    <div onClick={() => handleProceedToConfig('CINEMATIC LOOK')} className="cursor-pointer bg-slate-800/40 border border-slate-700 rounded-2xl p-6 hover:border-yellow-400 hover:bg-slate-800 transition-all flex flex-col items-center text-center group">
                      <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Clapperboard className="text-yellow-400" /></div>
                      <h3 className="text-xl font-bold text-white mb-2">Cinematic Look</h3>
                      <p className="text-slate-400 text-sm">Estetika film dramatis dengan kedalaman ruang (depth of field) dan pencahayaan artistik.</p>
                    </div>

                    {selectedMode === 'product-only' && (
                      <div onClick={() => handleProceedToConfig('POV HAND REVIEW')} className="cursor-pointer bg-slate-800/40 border border-slate-700 rounded-2xl p-6 hover:border-yellow-400 hover:bg-slate-800 transition-all flex flex-col items-center text-center group">
                        <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Eye className="text-yellow-400" /></div>
                        <h3 className="text-xl font-bold text-white mb-2">POV Hand Review</h3>
                        <p className="text-slate-400 text-sm">Sudut pandang orang pertama (First Person), fokus interaksi tangan dengan produk.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          )}

          {renderStep === 4 && (
            <section className="space-y-8 w-full max-w-4xl mx-auto">
              <button onClick={() => goToStep(3)} className="text-sm text-slate-400 mb-4">&larr; Kembali ke Visual Style</button>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <h2 className="text-4xl font-bold text-white">Konfigurasi Kampanye</h2>
                <div className="bg-yellow-400/10 border border-yellow-400/30 px-4 py-2 rounded-lg text-yellow-400 text-sm font-semibold mt-2 md:mt-0 flex items-center gap-2">
                  Style: {config.style}
                </div>
              </div>
              
              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm font-medium flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  {errorMsg}
                </div>
              )}

              <div className="bg-slate-800/60 p-8 rounded-3xl border border-slate-700 grid md:grid-cols-2 gap-8">
                
                {selectedMode !== 'product-only' && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-300">Composition Focus</label>
                    <select 
                      value={config.composition} 
                      onChange={(e) => setConfig({...config, composition: e.target.value})} 
                      disabled={config.style === 'POV HAND REVIEW' || selectedMode === 'model-only'}
                      className={`w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-4 text-white outline-none ${config.style === 'POV HAND REVIEW' || selectedMode === 'model-only' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {selectedMode === 'model-only' ? (
                         <option value="Model Focus">Model Focus (Storytelling & Ekspresi)</option>
                      ) : (
                        <>
                          <option value="Balanced">Balanced (Seimbang)</option>
                          <option value="Model Focus">Model Focus (Fokus Ekspresi & Pose)</option>
                          <option value="Product Focus">Product Focus (Detail & Close-Up Produk)</option>
                        </>
                      )}
                    </select>
                    {config.style === 'POV HAND REVIEW' && <p className="text-[10px] text-yellow-400 mt-1">Dikunci ke Product Focus untuk gaya POV.</p>}
                    {selectedMode === 'model-only' && <p className="text-[10px] text-yellow-400 mt-1">Dikunci secara otomatis untuk menyempurnakan workflow alur penceritaan (storytelling).</p>}
                  </div>
                )}
              
                <div className={`space-y-3 ${selectedMode === 'product-only' ? 'col-span-1 md:col-span-2' : ''}`}>
                  <label className="text-sm font-medium text-slate-300">Environment Location</label>
                  <select value={config.environment} onChange={(e) => setConfig({...config, environment: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-4 text-white outline-none mb-2">
                    <option>Mirror Selfie di Kamar (Cermin Besar)</option>
                    <option>Studio Foto Clean (Warna Earth Tone / Monokrom)</option>
                    <option>Dapur Estetik (Modern & Bersih)</option>
                    <option>Di Dalam Mobil (Vibes Perjalanan Tol Jakarta)</option>
                    <option>Pedestrian Walkway (Suasana Sudirman CFD)</option>
                    <option>Teras Rumah Tropis Minimalis (Gaya Perumahan Mewah)</option>
                    <option>Fitting Room Mall (Pencahayaan Terang & Bersih)</option>
                    <option>Tabletop Lifestyle (Meja Kayu/Marble dengan Props Ringan)</option>
                    <option>Kamar Tidur (Casual, Nuansa Pagi/Malam)</option>
                    <option>Meja Kerja / Home Office (Produktif)</option>
                    <option>Kamar Mandi / Vanity Area (Beauty/Skincare)</option>
                    <option>Cafe Aesthetic (Indoor/Outdoor Ambient)</option>
                    <option>Taman Kota / Urban Park (Outdoor)</option>
                    <option>Area Gym / Fitness Space (Aktif)</option>
                    <option>Studio Dramatic (Dark / Moody Lighting)</option>
                    <option>Luxury Interior (Sofa, Kaca, High-End)</option>
                    <option>Minimalist Architecture Space (Clean & Artistic)</option>
                    <option value="Custom (Tulis Sendiri)">+ Custom (Tulis Sendiri)</option>
                  </select>

                  {config.environment === 'Custom (Tulis Sendiri)' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <textarea
                        value={config.customEnvironment}
                        onChange={(e) => setConfig({...config, customEnvironment: e.target.value})}
                        placeholder="Cth: Kafe aesthetic bergaya industrial dengan meja kayu, banyak tanaman hias gantung, dan lighting warm natural..."
                        className="w-full bg-[#0f172a]/80 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm outline-none min-h-[80px] resize-none focus:ring-1 focus:ring-yellow-500 placeholder:text-slate-600"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Aspect Ratio</label>
                  <div className="flex gap-2 bg-[#0f172a] p-1.5 rounded-xl border border-slate-600">
                    {['9:16', '1:1', '16:9'].map(r => <button key={r} onClick={() => setConfig({...config, aspectRatio: r})} className={`flex-1 py-3 text-xs font-medium rounded-lg transition-all ${config.aspectRatio === r ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>{r}</button>)}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-300">Jumlah Scene</label>
                  <div className="flex gap-2 bg-[#0f172a] p-1.5 rounded-xl border border-slate-600">
                    {[4, 8, 12].map(n => <button key={n} onClick={() => setConfig({...config, length: n})} className={`flex-1 py-3 text-xs font-medium rounded-lg transition-all ${config.length === n ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>{n} Scene</button>)}
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2 pt-6 mt-4 border-t border-slate-700/50">
                  <button onClick={handleGenerateContent} disabled={isGenerating || !productName} className="w-full py-5 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl font-bold text-[#0f172a] text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-yellow-500/50"><Video className="w-6 h-6" /> Generate Kampanye Sekarang</button>
                </div>
              </div>
            </section>
          )}

          {renderStep === 4.5 && (
            <section className="flex flex-col items-center justify-center text-center space-y-8 min-h-[60vh] w-full max-w-2xl mx-auto">
              <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                <div className="absolute inset-0 border-4 border-yellow-500/20 rounded-full animate-ping"></div>
                <div className="absolute inset-2 border-4 border-t-yellow-400 border-r-transparent border-b-amber-500 border-l-transparent rounded-full animate-spin"></div>
                <TrendingUp className="text-yellow-400 w-12 h-12 animate-pulse shadow-yellow-500" strokeWidth={2.5} />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-white tracking-tight animate-pulse">{generationStatus}</h2>
                <p className="text-slate-400 text-lg">Menerapkan arahan gaya visual dan mengunci lingkungan secara ketat...</p>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mt-8 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full transition-all duration-1000" style={{ width: generationStatus.includes('Rendering') ? '80%' : '30%' }}></div>
              </div>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Locked Attribute Processing</p>
            </section>
          )}

          {renderStep === 5 && (
            <section className="space-y-12 w-full pb-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-xs font-semibold text-yellow-400 uppercase">Final Output</div>
                  <h2 className="text-4xl font-bold text-white flex items-center gap-3">Visual Storyboard <Sparkles className="text-yellow-400 w-8 h-8" /></h2>
                </div>
                <button onClick={handleReset} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white font-medium text-sm transition-colors">+ Buat Baru</button>
              </div>
              
              <div className="flex flex-wrap gap-3 bg-slate-800/40 border border-slate-700 p-4 rounded-xl">
                 <span className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-1 rounded">Style: <span className="text-yellow-400">{config.style}</span></span>
                 {selectedMode !== 'product-only' && (
                    <span className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-1 rounded">Focus: <span className="text-yellow-400">{config.composition}</span></span>
                 )}
                 {selectedMode !== 'model-only' && (
                    <span className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-1 rounded">Motion: <span className="text-yellow-400 capitalize">Auto-Subtle (Internal)</span></span>
                 )}
                 {selectedMode === 'model-only' && (
                    <span className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-1 rounded">Motion: <span className="text-yellow-400 capitalize">{(config.style === 'Vlog Style') ? 'Subtle (Internal)' : 'Static (Internal)'}</span></span>
                 )}
                 <span className="text-xs font-medium bg-slate-700 text-slate-300 px-2 py-1 rounded">Env: <span className="text-yellow-400">{config.environment === 'Custom (Tulis Sendiri)' ? 'Custom Location' : config.environment}</span></span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {scenes.map((scene) => (
                  <SceneCard key={scene.id} scene={scene} globalIdentity={globalIdentity} config={config} handleDownloadImage={handleDownloadImage} uploadedFiles={uploadedFiles} selectedMode={selectedMode} scenesDataRef={scenesDataRef} />
                ))}
              </div>
              
              <div className="mt-16 border-t border-slate-700/50 pt-12 flex flex-col items-center space-y-8">
                <div className="text-center space-y-3"><h3 className="text-3xl font-bold text-white">Langkah Selanjutnya</h3><p className="text-slate-400 max-w-lg mx-auto">Unduh hasil produksi yang sudah konsisten atau lanjutkan ke generator video video profesional.</p></div>
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl justify-center">
                  <button onClick={handleDownloadAllAssets} disabled={isZipping} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50">{isZipping ? <Loader2 className="animate-spin text-yellow-400" /> : <Download className="text-yellow-400" />} Download All Assets (.zip)</button>
                  <button onClick={() => setShowExternalPlatforms(!showExternalPlatforms)} className="flex-1 py-4 bg-yellow-500 hover:bg-yellow-400 rounded-xl font-bold text-[#0f172a] flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(250,204,21,0.3)]">Generate Video AI <ChevronDown className={`transition-transform duration-300 ${showExternalPlatforms ? 'rotate-180' : ''}`} /></button>
                </div>
                {showExternalPlatforms && (
                  <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col items-center text-center hover:border-blue-500/50 transition-colors">
                      <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center mb-5 border border-slate-600"><span className="text-blue-500 font-extrabold text-2xl">M</span></div>
                      <h4 className="text-lg text-white font-bold mb-2">Meta AI</h4><p className="text-xs text-slate-400 mb-6 flex-grow leading-relaxed">Sempurna untuk video gaya cinematic reel.</p>
                      <a href="https://www.meta.ai" target="_blank" rel="noreferrer" className="w-full py-3 bg-blue-600/10 text-blue-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2">Buka Meta AI <ExternalLink size={14} /></a>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col items-center text-center hover:border-slate-300 transition-colors">
                      <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center mb-5 border border-slate-600"><span className="text-slate-200 font-extrabold text-2xl">𝕏</span></div>
                      <h4 className="text-lg text-white font-bold mb-2">Grok AI</h4><p className="text-xs text-slate-400 mb-6 flex-grow leading-relaxed">Generator video berbasis vision terkanggih.</p>
                      <a href="https://grok.com/" target="_blank" rel="noreferrer" className="w-full py-3 bg-slate-700/50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2">Buka Grok AI <ExternalLink size={14} /></a>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col items-center text-center hover:border-emerald-500/50 transition-colors">
                      <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center mb-5 border border-slate-600"><span className="text-emerald-500 font-extrabold text-2xl">F</span></div>
                      <h4 className="text-lg text-white font-bold mb-2">Flow AI</h4><p className="text-xs text-slate-400 mb-6 flex-grow leading-relaxed">Editor video timeline berbasis prompt Google.</p>
                      <a href="https://labs.google/flow/about" target="_blank" rel="noreferrer" className="w-full py-3 bg-emerald-600/10 text-emerald-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2">Buka Flow AI <ExternalLink size={14} /></a>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;