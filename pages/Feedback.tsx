
import React, { useState, useEffect } from 'react';
import { db } from '../services/storage';
import { UserRole, Feedback as FeedbackType } from '../types';

const Feedback: React.FC = () => {
  const user = db.getCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;
  
  const [feedbacks, setFeedbacks] = useState<FeedbackType[]>([]);
  const [content, setContent] = useState('');
  const [type, setType] = useState<'Feedback' | 'Feature Request'>('Feedback');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    setFeedbacks(db.getFeedbacks().reverse());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    db.addFeedback(type, content);
    setContent('');
    setIsSubmitted(true);
    setFeedbacks(db.getFeedbacks().reverse());
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Support & Feedback</h1>
          <p className="text-slate-500 text-sm">Help us improve RMS. Request features or report issues.</p>
        </div>
      </div>

      {!isAdmin ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={() => setType('Feedback')}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${type === 'Feedback' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
              >
                General Feedback
              </button>
              <button 
                type="button" 
                onClick={() => setType('Feature Request')}
                className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${type === 'Feature Request' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
              >
                Feature Request
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Message</label>
              <textarea 
                required
                rows={5}
                className="w-full border border-slate-200 p-4 rounded-2xl outline-none focus:border-indigo-500 transition-colors text-slate-700 bg-slate-50/50"
                placeholder={type === 'Feedback' ? "Tell us how we are doing..." : "Describe a feature you would like to see..."}
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>

            {isSubmitted && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold rounded-xl animate-in fade-in zoom-in">
                Thank you! Your {type.toLowerCase()} has been sent to management.
              </div>
            )}

            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all">
              Send Message
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Staff Submissions</h3>
          {feedbacks.length === 0 ? (
            <div className="p-12 bg-white border border-dashed rounded-3xl text-center text-slate-400 italic">No feedback received yet.</div>
          ) : (
            feedbacks.map(fb => (
              <div key={fb.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative group overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${fb.type === 'Feedback' ? 'bg-blue-500' : 'bg-purple-500'}`}></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-500">
                      {fb.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{fb.userName}</p>
                      <p className="text-[10px] text-slate-400">{new Date(fb.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${fb.type === 'Feedback' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {fb.type}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  {fb.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Feedback;
