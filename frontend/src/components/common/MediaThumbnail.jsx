import React, { useEffect, useState } from 'react';
import { FileText, PlayCircle } from 'lucide-react';

const buildPdfPreviewUrl = (url) => {
    if (!url) return '';
    return `${url}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH`;
};

const VideoThumbnail = ({ url, title }) => {
    const [thumbnailUrl, setThumbnailUrl] = useState('');
    const [captureFailed, setCaptureFailed] = useState(false);

    useEffect(() => {
        if (!url || typeof document === 'undefined') {
            return undefined;
        }

        let cancelled = false;
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const fail = () => {
            if (!cancelled) setCaptureFailed(true);
        };

        const capture = () => {
            if (cancelled || !context || !video.videoWidth || !video.videoHeight) {
                fail();
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                if (!cancelled) {
                    setThumbnailUrl(dataUrl);
                }
            } catch {
                fail();
            }
        };

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.crossOrigin = 'anonymous';

        video.onloadeddata = () => {
            const seekTarget = Number.isFinite(video.duration) && video.duration > 0
                ? Math.min(Math.max(video.duration * 0.15, 0.1), 1)
                : 0.1;

            try {
                video.currentTime = seekTarget;
            } catch {
                capture();
            }
        };
        video.onseeked = capture;
        video.onerror = fail;
        video.src = url;

        return () => {
            cancelled = true;
            video.pause();
            video.removeAttribute('src');
            video.load();
        };
    }, [url]);

    if (thumbnailUrl) {
        return (
            <div className="relative w-full h-full">
                <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center shadow-lg">
                    <PlayCircle className="w-5 h-5" />
                </div>
            </div>
        );
    }

    if (!captureFailed) {
        return (
            <div className="relative w-full h-full bg-gradient-to-br from-slate-950 via-violet-950/80 to-slate-900">
                <video
                    src={url}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover opacity-35"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-black/65 text-white flex items-center justify-center border border-white/15">
                        <PlayCircle className="w-7 h-7" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-gradient-to-br from-slate-950 via-violet-950/80 to-slate-900 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/65 text-white flex items-center justify-center border border-white/15">
                <PlayCircle className="w-7 h-7" />
            </div>
        </div>
    );
};

const PdfThumbnail = ({ url, title }) => (
    <div className="relative w-full h-full bg-white overflow-hidden">
        <iframe
            src={buildPdfPreviewUrl(url)}
            title={title}
            className="absolute inset-0 w-[138%] h-[138%] origin-top-left scale-[0.72] pointer-events-none bg-white"
        />
        <div className="absolute inset-0 border border-black/5" />
        <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase tracking-[0.18em] shadow-sm">
            PDF
        </div>
        <div className="absolute bottom-3 left-3 w-11 h-11 rounded-2xl bg-white/92 text-rose-500 flex items-center justify-center shadow-sm border border-rose-100">
            <FileText className="w-6 h-6" />
        </div>
    </div>
);

const MediaThumbnail = ({ item, fallback }) => {
    if (item.type === 'IMAGE') {
        return (
            <img
                src={item.url}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover"
            />
        );
    }

    if (item.type === 'VIDEO') {
        return <VideoThumbnail url={item.url} title={item.title} />;
    }

    if (item.type === 'PDF') {
        return <PdfThumbnail url={item.url} title={item.title} />;
    }

    return fallback || (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
            <FileText className="w-8 h-8 text-slate-500" />
        </div>
    );
};

export default MediaThumbnail;
