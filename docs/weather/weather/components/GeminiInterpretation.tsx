import React from 'react';
import { GeminiIcon } from './icons';

interface GeminiInterpretationProps {
  text: string;
  loading: boolean;
  onAnalyze: () => void;
}

const GeminiInterpretation: React.FC<GeminiInterpretationProps> = ({ text, loading, onAnalyze }) => {
  const formattedText = text
    .replace(/### (.*)/g, '<h3 class="text-xl font-semibold text-info mt-4 mb-2">$1</h3>')
    .replace(/## (.*)/g, '<h2 class="text-2xl font-bold text-white mt-6 mb-3 border-b border-gray-700 pb-2">$1</h2>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\* (.*)/g, '<li class="ml-5 list-disc">$1</li>')
    .replace(/(\d+\.\s)/g, '<br><strong class="text-success">$1</strong>');


  const renderSkeleton = () => (
      <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-base-100 rounded w-1/3"></div>
          <div className="h-4 bg-base-100 rounded w-full"></div>
          <div className="h-4 bg-base-100 rounded w-5/6"></div>
          <div className="h-6 bg-base-100 rounded w-1/4 mt-6"></div>
          <div className="h-4 bg-base-100 rounded w-full"></div>
          <div className="h-4 bg-base-100 rounded w-4/5"></div>
      </div>
  );
  
  const renderInitialState = () => (
    <div className='text-center'>
        <p className="text-gray-400">Mevcut hava durumu tahminlerine dayanarak sulama, ilaçlama ve diğer tarımsal faaliyetler hakkında Gemini'den özel tavsiyeler almak için analiz yapın.</p>
    </div>
  );

  return (
    <div className="bg-base-200 p-6 rounded-xl shadow-lg mt-6 col-span-1 md:col-span-2">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
        <div className="flex items-center space-x-3">
          <GeminiIcon className="w-8 h-8 text-secondary" />
          <h2 className="text-2xl font-bold text-white">Gemini Tarım Analizi</h2>
        </div>
        <button 
            onClick={onAnalyze} 
            disabled={loading} 
            className="btn bg-primary hover:bg-primary/80 disabled:bg-base-100 disabled:text-gray-500 text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 w-full sm:w-auto flex items-center justify-center space-x-2"
        >
            {loading && <span className="loading loading-spinner loading-xs"></span>}
            <span>{loading ? 'Analiz Ediliyor...' : 'Analiz Yap'}</span>
        </button>
      </div>
      <div className="prose prose-invert max-w-none text-gray-300 min-h-[10rem]">
        {loading ? renderSkeleton() : (text ? <div dangerouslySetInnerHTML={{ __html: formattedText }} /> : renderInitialState())}
      </div>
    </div>
  );
};

export default GeminiInterpretation;
