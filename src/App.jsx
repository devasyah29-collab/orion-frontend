import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, ImageIcon, UploadCloud, Video, User, 
  CheckCircle2, Wand2, Copy, Mic, AlignLeft, ChevronDown,
  Loader2, Download, Clapperboard, ExternalLink, ChevronRight,
  Camera, Eye, Focus, BookOpen, TrendingUp, AlertCircle, X
} from 'lucide-react';

// URL Backend Vercel Anda yang sudah online
const BACKEND_URL = "https://orion-backend-flame.vercel.app/api/gemini";

// Helper fetch dengan sistem retry otomatis (exponential backoff)
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
      return "FIRST PERSON POV: Sudut pandang orang pertama murni. Tangan WAJIB terlihat memegang produk di foreground secara dominan. DILARANG shot tanpa tangan.";
    case 'COMMERCIAL':
      return "COMMERCIAL STUDIO: Fokus produk di tengah/rule of thirds. Lighting terang, clean, dan merata. Background sederhana dan tidak distraktif.";
    case 'CINEMATIC LOOK':
      return "CINEMATIC LOOK: Estetika film dramatis, depth of field (background blur), pencahayaan artistik terkontrol, kamera stabil.";
    case 'UGC':
    case 'UGC / Authentic':
      return "UGC: Natural, organik, casual smartphone handheld feel. Terasa seperti konten buatan pengguna asli.";
    case 'UGC Storytelling':
      return "UGC Storytelling: Vlog personal naratif, relatable, fokus pada penyampaian emosi dan alur cerita harian.";
    case 'Mirror Story':
      return "Mirror Story: Komposisi refleksi di cermin (mirror selfie style). Fokus interaksi model dengan cermin.";
    case 'Vlog Style':
      return "VLOG STYLE: Self-recording murni (model memegang kamera sendiri sejauh lengan). Wajib terlihat lengan memegang kamera, eye contact ke lensa.";
    default:
      return `Gaya Visual: ${style}`;
  }
};

const NO_TEXT_POLICY = "No Overlay Text Policy: no text, no subtitle, no watermark, clean visual, only product label allowed.";

const getBackgroundMotionDirective = (env, mode, style) => {
  if (mode === 'model-only' && style !== 'Vlog Style') {
    return "[STATIC ENVIRONMENT] Background statis sempurna, stabil, dan konsisten di semua scene.";
  }
  return "[SUBTLE MOTION] Gerakan latar belakang sangat halus (secondary layer) agar tidak merusak fokus subjek utama.";
};

const CustomAlert = ({ message, type = 'error', onClose }) => {
  if (!message) return null;
  const bgClass = type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400';
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl border flex items-center gap-3 shadow-lg backdrop-blur-md animate-in slide-in-from-top-4 ${bgClass}`}>
      <AlertCircle size={18} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X size={16} /></button>
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

  const generateVideoPrompt = () => {
    if (!globalIdentity) return "Identitas belum siap.";
    const activeStyleDirective = getStyleDirective(config.style);
    return `Video ${config.aspectRatio}, style: ${config.style}.\nVoice over: "${script || scene.desc}"\nModel: ${globalIdentity.modelDetails?.faceAndHair || 'T/A'}\nProduk: ${globalIdentity.productDetails?.shapeAndColor || 'T/A'}\nLokasi: ${globalIdentity.environmentDetails?.settingAndProps || 'T/A'}\nArahan: ${activeStyleDirective}\nVisual: ${customVisual}\nClean visual, no text overlay.`;
  };

  useEffect(() => {
    const newVideoPrompt = generateVideoPrompt();
    setVideoPrompt(newVideoPrompt);
    if (scenesDataRef.current) {
      scenesDataRef.current[scene.id] = { customAction: customVisual, script, videoPrompt: newVideoPrompt };
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
      const urlEndpoint = `${BACKEND_URL}?model=gemini-2.5-flash`;
      const activeStyleDirective = getStyleDirective(config.style);
      const imagePrompt = `Buat gambar fotorealistis konsisten:\nStyle: ${activeStyleDirective}\nProduk: ${globalIdentity.productDetails?.shapeAndColor || 'T/A'}\nModel: ${globalIdentity.modelDetails?.faceAndHair || 'T/A'}\nLokasi: ${globalIdentity.environmentDetails?.settingAndProps || 'T/A'}\nAksi Scene: ${customVisual}\nAturan: ${NO_TEXT_POLICY}`;

      const parts = [{ text: imagePrompt }];
      if (selectedMode === 'model-product' && uploadedFiles.modelBase64 && uploadedFiles.productBase64) {
        parts.push({ inlineData: { mimeType: uploadedFiles.modelMime, data: uploadedFiles.modelBase64 } });
        parts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
      } else if (uploadedFiles.productBase64) {
        parts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
      }

      const response = await fetchWithRetry(urlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } })
      });
      const data = await response.json();
      if (data.error) {
        setCardError(`Error: ${data.error.message}`);
        return;
      }
      const base64 = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
      if (base64) {
        setLocalImageUrl(`data:image/png;base64,${base64}`);
        scene.imageUrl = `data:image/png;base64,${base64}`;
      } else {
        setCardError("Gagal memproses gambar.");
      }
    } catch (err) {
      setCardError("Koneksi server gagal.");
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-lg flex flex-col h-full relative">
      <CustomAlert message={cardError} onClose={() => setCardError('')} />
      <div className={`${config.aspectRatio === '16:9' ? 'aspect-video' : config.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[9/16]'} bg-[#0f172a] relative overflow-hidden shrink-0`}>
        {localImageUrl ? (
          <img src={localImageUrl} alt={`Scene ${scene.id}`} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
            <ImageIcon size={32} className="mb-2 opacity-50" />
            <span className="text-xs uppercase tracking-widest font-mono">Gagal Render</span>
          </div>
        )}
        {isRegenerating && (
          <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <Loader2 className="text-yellow-400 w-8 h-8 animate-spin mb-2" />
            <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">RENDERING...</span>
          </div>
        )}
        <div className="absolute top-3 left-3 bg-[#0f172a]/80 px-2.5 py-1 rounded text-xs font-mono font-bold text-yellow-400 border border-yellow-400/30 z-20">
          SCENE 0{scene.id}
        </div>
        <button onClick={() => handleDownloadImage(localImageUrl, scene.id)} disabled={!localImageUrl} className="absolute top-3 right-3 bg-[#0f172a]/80 p-2 rounded text-yellow-400 border border-yellow-400/30 hover:bg-yellow-400 hover:text-[#0f172a] transition-colors z-20">
          <Download size={16} />
        </button>
      </div>

      <div className="p-5 flex-grow flex flex-col space-y-4 bg-slate-800/20">
        <div className="space-y-1">
          <label className="flex items-center justify-between text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Clapperboard size={14} /> 1. Kustomisasi Aksi</span>
          </label>
          <textarea
            value={customVisual}
            onChange={(e) => setCustomVisual(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl p-3 text-xs text-slate-200 resize-none outline-none min-h-[60px]"
          />
          <button onClick={handleRegenerateImage} disabled={isRegenerating} className="w-full py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
            {isRegenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} Revisi Gambar (AI)
          </button>
        </div>

        <div className="space-y-1">
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
            <Mic size={14} /> 2. Voice Over Script
          </label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className="w-full bg-[#0f172a] border border-slate-700/50 rounded-xl p-3 text-xs text-slate-200 resize-none outline-none min-h-[60px]"
          />
        </div>

        <div className="space-y-1 flex-grow flex flex-col justify-end">
          <button onClick={copyPrompt} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all">
            <Copy size={16} className="text-yellow-400" /> Salin Prompt Video
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
  const [appError, setAppError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({ 
    model: null, product: null, modelBase64: null, productBase64: null, modelMime: null, productMime: null
  });
  
  const [productName, setProductName] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [config, setConfig] = useState({
    style: 'COMMERCIAL', composition: 'Balanced', length: 4, aspectRatio: '9:16', environment: 'Studio Foto Clean (Warna Earth Tone / Monokrom)', customEnvironment: ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [globalIdentity, setGlobalIdentity] = useState(null);
  const [scenes, setScenes] = useState([]);
  const scenesDataRef = useRef({});

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

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const detectProductWithAI = async (file, newUploads) => {
    if (selectedMode === 'model-only') return;
    setIsDetecting(true);
    setProductName('');
    try {
      const base64Data = newUploads.productBase64;
      const url = `${BACKEND_URL}?model=gemini-2.5-flash`;

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
      if (data.error) {
        setProductName(`Gagal mendeteksi`);
        setAppError(`Gemini Error: ${data.error.message}`);
        return;
      }

      const detectedName = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      setProductName(detectedName || "Produk Terdeteksi");
    } catch (error) {
      setProductName("Produk Umum");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    const base64Data = await fileToBase64(file);
    const newUploads = { ...uploadedFiles, [type]: imageUrl, [`${type}Base64`]: base64Data, [`${type}Mime`]: file.type };
    setUploadedFiles(newUploads);
    if (type === 'product') detectProductWithAI(file, newUploads);
  };

  const handleGenerateContent = async () => {
    if (!productName) return;
    setIsGenerating(true);
    setGenerationStatus('Menganalisis Aset & Kunci Konsistensi...');
    goToStep(4.5);

    setTimeout(async () => {
      try {
        const textUrl = `${BACKEND_URL}?model=gemini-2.5-flash`;
        const activeStyleDirective = getStyleDirective(config.style);
        const promptStructure = `Rancang storyboard komparatif iklan produk ${productName} sebanyak ${config.length} scene. Style: ${activeStyleDirective}. Lokasi: ${config.environment}. Output wajib JSON murni tanpa markdown block.
        Format skema JSON yang wajib:
        {
          "globalIdentity": {
            "modelDetails": {"faceAndHair": "detail wajah model", "wardrobeTop": "baju atas", "wardrobeBottom": "baju bawah", "accessories": "aksesoris"},
            "productDetails": {"shapeAndColor": "bentuk & warna produk", "materialAndTexture": "bahan & tekstur produk"},
            "environmentDetails": {"settingAndProps": "detail properti lokasi", "lightingAndMood": "pencahayaan"}
          },
          "scenes": [
            {"desc": "kalimat voice over adegan", "prompt": "deskripsi detail framing aksi kamera untuk generate gambar"}
          ]
        }`;

        const textParts = [{ text: promptStructure }];
        if (uploadedFiles.productBase64) {
          textParts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
        }

        const response = await fetchWithRetry(textUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: textParts }] })
        });
        const promptData = await response.json();
        const rawText = promptData.candidates[0].content.parts[0].text;
        const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const resultObj = JSON.parse(cleanedText);

        setGlobalIdentity(resultObj.globalIdentity);

        // Rendering Scenes Images
        const imageUrlEndpoint = `${BACKEND_URL}?model=gemini-2.5-flash`;
        const finalScenes = [];
        const generatedScenes = resultObj.scenes.slice(0, config.length);

        for (let i = 0; i < generatedScenes.length; i++) {
          setGenerationStatus(`Menggambar Storyboard Scene 0${i + 1}...`);
          const scene = generatedScenes[i];
          const strictPrompt = `Foto iklan berkualitas tinggi:\nStyle: ${activeStyleDirective}\nProduk: ${resultObj.globalIdentity.productDetails?.shapeAndColor}\nLatar Belakang: ${resultObj.globalIdentity.environmentDetails?.settingAndProps}\nAksi: ${scene.prompt}\nAturan: ${NO_TEXT_POLICY}`;

          const parts = [{ text: strictPrompt }];
          if (uploadedFiles.productBase64) {
            parts.push({ inlineData: { mimeType: uploadedFiles.productMime, data: uploadedFiles.productBase64 } });
          }

          try {
            const imgRes = await fetchWithRetry(imageUrlEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ['IMAGE'] } })
            });
            const imgData = await imgRes.json();
            const base64 = imgData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
            finalScenes.push({ id: i + 1, desc: scene.desc, prompt: scene.prompt, imageUrl: base64 ? `data:image/png;base64,${base64}` : '' });
          } catch (e) {
            finalScenes.push({ id: i + 1, desc: scene.desc, prompt: scene.prompt, imageUrl: '' });
          }
        }

        setScenes(finalScenes);
        goToStep(5);
      } catch (err) {
        setErrorMsg('Gagal memproses struktur. Silakan coba kembali.');
        goToStep(4);
      } finally {
        setIsGenerating(false);
      }
    }, 500);
  };

  const handleDownloadImage = (imageUrl, sceneId) => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `scene_${sceneId}.png`;
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
      
      let content = `=== STORYBOARD CAMPAIGN: ${productName.toUpperCase()} ===\n\n`;
      scenes.forEach(scene => {
        const localData = scenesDataRef.current[scene.id] || {};
        content += `SCENE 0${scene.id}\nAction: ${localData.customAction || scene.prompt}\nVO Script: ${localData.script || scene.desc}\n\n`;
      });

      zip.file(`Campaign_Storyboard.txt`, content);
      scenes.forEach(s => {
        if (s.imageUrl) {
          const b64 = s.imageUrl.split(',')[1];
          if (b64) zip.file(`Scene_0${s.id}.png`, b64, { base64: true });
        }
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `${productName}_Assets.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      setAppError("Gagal kompres ZIP.");
    } finally {
      setIsZipping(false);
    }
  };

  const handleReset = () => {
    goToStep(0);
    setUploadedFiles({ model: null, product: null, modelBase64: null, productBase64: null, modelMime: null, productMime: null });
    setProductName('');
    setGlobalIdentity(null);
    setScenes([]);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col relative selection:bg-yellow-500/30 selection:text-yellow-200">
      <CustomAlert message={appError} onClose={() => setAppError('')} />
      
      <header className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-lg border-b border-slate-800 h-20 flex items-center px-6 justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 cursor-pointer" onClick={handleReset}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.4)]">
            <TrendingUp className="text-[#0f172a] w-6 h-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Orion Content <span className="text-yellow-400">Studio</span></h1>
            <span className="text-[10px] text-slate-400 font-medium block">by YourDigital.Ai</span>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-8 flex flex-col justify-center">
        <div className={`transition-all duration-400 ${isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
          
          {renderStep === 0 && (
            <div className="text-center space-y-8 py-20 max-w-2xl mx-auto flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.4)]">
                <Sparkles className="text-[#0f172a] w-10 h-10" />
              </div>
              <h2 className="text-5xl font-extrabold text-white">Buat Iklan Video Kreatif Bersama <span className="text-yellow-400">Orion AI</span></h2>
              <p className="text-slate-400 text-lg">Konversikan gambar produk biasa menjadi sekumpulan storyboard iklan ber-narasi profesional dan konsisten.</p>
              <button onClick={() => goToStep(1)} className="px-10 py-4 bg-yellow-500 hover:bg-yellow-400 text-[#0f172a] font-bold rounded-full text-lg shadow-lg flex items-center gap-2">Mulai Sekarang <ChevronRight size={18} /></button>
            </div>
          )}

          {renderStep === 1 && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-white text-center">Pilih Tipe Workflow</h2>
              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <div onClick={() => { setSelectedMode('model-product'); goToStep(2); }} className="cursor-pointer bg-slate-800/40 p-8 border border-slate-700 rounded-2xl hover:border-yellow-400 hover:bg-slate-800/80 transition-all flex flex-col items-center text-center">
                  <User size={40} className="text-yellow-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Model + Produk</h3>
                  <p className="text-slate-400 text-sm">Visualisasi interaksi model AI menggunakan produk Anda secara konsisten.</p>
                </div>
                <div onClick={() => { setSelectedMode('product-only'); goToStep(2); }} className="cursor-pointer bg-slate-800/40 p-8 border border-slate-700 rounded-2xl hover:border-yellow-400 hover:bg-slate-800/80 transition-all flex flex-col items-center text-center">
                  <ImageIcon size={40} className="text-yellow-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Produk Saja</h3>
                  <p className="text-slate-400 text-sm">Fokus murni pada estetika dan detail produk untuk showcase sinematik.</p>
                </div>
              </div>
            </div>
          )}

          {renderStep === 2 && (
            <div className="space-y-8 max-w-2xl mx-auto">
              <button onClick={() => goToStep(1)} className="text-sm text-slate-400 hover:text-white">&larr; Kembali</button>
              <h2 className="text-3xl font-bold text-white">Unggah Gambar Referensi</h2>
              
              <div className="grid gap-6 md:grid-cols-1">
                {selectedMode === 'model-product' && (
                  <label className="border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/30 transition-all">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'model')} />
                    {uploadedFiles.model ? <><img src={uploadedFiles.model} className="w-16 h-16 object-cover rounded-lg mb-2"/><span className="text-yellow-400 font-bold text-sm">Model Terunggah</span></> : <><UploadCloud className="text-slate-500 mb-2" size={32} /><span>Upload Model</span></>}
                  </label>
                )}
                <label className="border-2 border-dashed border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/30 transition-all">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'product')} />
                  {uploadedFiles.product ? <><img src={uploadedFiles.product} className="w-16 h-16 object-contain rounded-lg mb-2"/><span className="text-yellow-400 font-bold text-sm">Produk Terunggah</span></> : <><ImageIcon className="text-slate-500 mb-2" size={32} /><span>Upload Produk</span></>}
                </label>
              </div>

              {uploadedFiles.product && (
                <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 space-y-4">
                  <label className="block text-xs font-bold text-yellow-400 uppercase tracking-widest">{isDetecting ? 'Menganalisis...' : 'Nama Produk'}</label>
                  <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-3 text-white outline-none" />
                  <div className="flex justify-end">
                    <button onClick={() => goToStep(3)} disabled={isDetecting || !productName} className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-[#0f172a] font-bold rounded-lg disabled:opacity-50">Lanjutkan</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {renderStep === 3 && (
            <div className="space-y-8 max-w-4xl mx-auto text-center md:text-left">
              <button onClick={() => goToStep(2)} className="text-sm text-slate-400 hover:text-white">&larr; Kembali</button>
              <h2 className="text-3xl font-bold text-white">Pilih Gaya Visual</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div onClick={() => { setConfig({...config, style: 'COMMERCIAL'}); goToStep(4); }} className="cursor-pointer bg-slate-800/40 p-6 border border-slate-700 rounded-2xl hover:border-yellow-400 transition-all text-center">
                  <Camera className="text-yellow-400 mx-auto mb-3" size={32} />
                  <h3 className="font-bold text-white">Commercial</h3>
                  <p className="text-slate-400 text-xs mt-1">Sempurna untuk katalog & branding rapi.</p>
                </div>
                <div onClick={() => { setConfig({...config, style: 'CINEMATIC LOOK'}); goToStep(4); }} className="cursor-pointer bg-slate-800/40 p-6 border border-slate-700 rounded-2xl hover:border-yellow-400 transition-all text-center">
                  <Clapperboard className="text-yellow-400 mx-auto mb-3" size={32} />
                  <h3 className="font-bold text-white">Cinematic</h3>
                  <p className="text-slate-400 text-xs mt-1">Efek pencahayaan film dramatis & stabil.</p>
                </div>
                <div onClick={() => { setConfig({...config, style: 'POV HAND REVIEW'}); goToStep(4); }} className="cursor-pointer bg-slate-800/40 p-6 border border-slate-700 rounded-2xl hover:border-yellow-400 transition-all text-center">
                  <Eye className="text-yellow-400 mx-auto mb-3" size={32} />
                  <h3 className="font-bold text-white">POV Hand Review</h3>
                  <p className="text-slate-400 text-xs mt-1">Sudut pandang mata pengguna memegang produk.</p>
                </div>
              </div>
            </div>
          )}

          {renderStep === 4 && (
            <div className="space-y-8 max-w-2xl mx-auto">
              <button onClick={() => goToStep(3)} className="text-sm text-slate-400 hover:text-white">&larr; Kembali</button>
              <h2 className="text-3xl font-bold text-white">Konfigurasi Kampanye</h2>
              <div className="bg-slate-800/60 p-8 rounded-2xl border border-slate-700 space-y-6">
                
                <div className="space-y-2">
                  <label className="text-sm text-slate-300">Lokasi / Lingkungan</label>
                  <select value={config.environment} onChange={(e) => setConfig({...config, environment: e.target.value})} className="w-full bg-[#0f172a] border border-slate-600 rounded-xl px-4 py-3 text-white outline-none">
                    <option>Studio Foto Clean (Warna Earth Tone / Monokrom)</option>
                    <option>Dapur Estetik (Modern & Bersih)</option>
                    <option>Cafe Aesthetic (Indoor/Outdoor Ambient)</option>
                    <option>Teras Rumah Tropis Minimalis (Gaya Perumahan Mewah)</option>
                    <option>Tabletop Lifestyle (Meja Kayu/Marble dengan Props Ringan)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Aspect Ratio</label>
                    <div className="flex gap-1 bg-[#0f172a] p-1 rounded-xl border border-slate-600">
                      {['9:16', '1:1', '16:9'].map(r => (
                        <button key={r} onClick={() => setConfig({...config, aspectRatio: r})} className={`flex-grow py-2 text-xs font-bold rounded-lg ${config.aspectRatio === r ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-slate-300">Jumlah Scene</label>
                    <div className="flex gap-1 bg-[#0f172a] p-1 rounded-xl border border-slate-600">
                      {[4, 8, 12].map(n => (
                        <button key={n} onClick={() => setConfig({...config, length: n})} className={`flex-grow py-2 text-xs font-bold rounded-lg ${config.length === n ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>{n}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={handleGenerateContent} className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-[#0f172a] font-bold rounded-xl text-lg flex items-center justify-center gap-2">
                  <Video size={20} /> Generate Kampanye AI
                </button>
              </div>
            </div>
          )}

          {renderStep === 4.5 && (
            <div className="text-center py-20 space-y-6 max-w-md mx-auto flex flex-col items-center">
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 border-4 border-yellow-500/20 rounded-full animate-ping"></div>
                <div className="absolute inset-0 border-4 border-t-yellow-400 border-r-transparent border-l-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-bold text-white">{generationStatus}</h2>
              <p className="text-slate-400 text-sm">Menyiapkan konsistensi visual dan pergerakan sekunder latar belakang...</p>
            </div>
          )}

          {renderStep === 5 && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-4xl font-extrabold text-white flex items-center gap-2">Visual Storyboard <Sparkles className="text-yellow-400" /></h2>
                  <p className="text-slate-400 text-sm mt-1">Seluruh scene telah di-generate secara konsisten dan siap diekspor.</p>
                </div>
                <button onClick={handleReset} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-white font-medium text-sm">+ Buat Baru</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {scenes.map(scene => (
                  <SceneCard key={scene.id} scene={scene} globalIdentity={globalIdentity} config={config} handleDownloadImage={handleDownloadImage} uploadedFiles={uploadedFiles} selectedMode={selectedMode} scenesDataRef={scenesDataRef} />
                ))}
              </div>

              <div className="border-t border-slate-700 pt-12 flex flex-col items-center space-y-6">
                <div className="flex gap-4 w-full max-w-xl justify-center">
                  <button onClick={handleDownloadAllAssets} disabled={isZipping} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all">
                    {isZipping ? <Loader2 className="animate-spin text-yellow-400" /> : <Download className="text-yellow-400" />} Unduh Semua Aset (.zip)
                  </button>
                  <button onClick={() => setShowExternalPlatforms(!showExternalPlatforms)} className="flex-1 py-4 bg-yellow-500 hover:bg-yellow-400 rounded-xl font-bold text-[#0f172a] flex items-center justify-center gap-2 transition-all">
                    Generate Video AI <ChevronDown className={`transition-transform ${showExternalPlatforms ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showExternalPlatforms && (
                  <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-blue-600/10 rounded-full flex items-center justify-center mb-4"><span className="text-blue-500 font-black">M</span></div>
                      <h4 className="text-white font-bold mb-2">Meta AI Video</h4>
                      <p className="text-slate-400 text-xs mb-4">Sangat cocok untuk membuat reel cinematic.</p>
                      <a href="https://www.meta.ai" target="_blank" rel="noreferrer" className="w-full py-2.5 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1">Buka Meta AI <ExternalLink size={12} /></a>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-600"><span className="text-slate-200 font-black">𝕏</span></div>
                      <h4 className="text-white font-bold mb-2">Grok AI Vision</h4>
                      <p className="text-slate-400 text-xs mb-4">Mesin video tercanggih berkecepatan tinggi.</p>
                      <a href="https://grok.com/" target="_blank" rel="noreferrer" className="w-full py-2.5 bg-slate-700/50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1">Buka Grok AI <ExternalLink size={12} /></a>
                    </div>
                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-emerald-600/10 rounded-full flex items-center justify-center mb-4"><span className="text-emerald-500 font-black">F</span></div>
                      <h4 className="text-white font-bold mb-2">Flow AI</h4>
                      <p className="text-slate-400 text-xs mb-4">Editor video timeline instan berbasis prompt.</p>
                      <a href="https://labs.google/flow/about" target="_blank" rel="noreferrer" className="w-full py-2.5 bg-emerald-600/20 text-emerald-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1">Buka Flow AI <ExternalLink size={12} /></a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;