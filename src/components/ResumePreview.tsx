import React from 'react';

type Experience = {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
};

type Education = {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  current: boolean;
};

type Data = {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
  };
  experience: Experience[];
  education: Education[];
  skills: string[];
};

type Props = {
  data: Data;
  colors: { primary: string; accent: string; headerText: string };
  photoSrc?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export const ResumePreview = React.forwardRef<HTMLDivElement, Props>(({ data, colors, photoSrc, ...rest }, ref) => {
  const p = colors.primary;
  const a = colors.accent;
  const ht = colors.headerText || '#ffffff';

  return (
    <div ref={ref} {...rest} style={{ width: 794, minHeight: 1123, background: '#fff', color: '#0f172a' }}>
      <div style={{ padding: 28 }}>
        <div style={{ background: p, color: ht, borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: ht }}>{data.personalInfo.name || 'Seu Nome'}</div>
            <div style={{ marginTop: 6, fontSize: 11, opacity: 0.95, color: ht }}>
              {[data.personalInfo.email, data.personalInfo.phone, data.personalInfo.location]
                .filter(Boolean)
                .join(' • ')}
            </div>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', background: a, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {photoSrc ? (
              // square-cropped image with rounded corners
              <img src={photoSrc} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '70%', height: '70%', borderRadius: 9999, background: 'rgba(255,255,255,0.35)' }} />
            )}
          </div>
        </div>

        {data.personalInfo.summary && (
          <section style={{ marginTop: 24 }}>
            <h3 style={{ color: p, fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Resumo</h3>
            <div style={{ height: 3, width: 40, background: p, borderRadius: 4, marginBottom: 12 }} />
            <p style={{ fontSize: 12, lineHeight: '18px', color: '#334155' }}>{data.personalInfo.summary}</p>
          </section>
        )}

        {data.experience?.length > 0 && data.experience.some(e => e.company || e.position) && (
          <section style={{ marginTop: 20 }}>
            <h3 style={{ color: p, fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Experiência</h3>
            <div style={{ height: 3, width: 40, background: p, borderRadius: 4, marginBottom: 12 }} />
            <div style={{ display: 'grid', gap: 10 }}>
              {data.experience.map((e, i) => (
                (e.company || e.position) && (
                  <div key={i}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{e.position || 'Cargo'}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{e.company}</div>
                    {(e.startDate || e.endDate || e.current) && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {(e.startDate || 'Início')} — {e.current ? 'Atual' : (e.endDate || 'Fim')}
                      </div>
                    )}
                    {e.description && (
                      <div style={{ fontSize: 12, color: '#334155', marginTop: 6, whiteSpace: 'pre-wrap' }}>{e.description}</div>
                    )}
                  </div>
                )
              ))}
            </div>
          </section>
        )}

        {data.education?.length > 0 && data.education.some(e => e.institution || e.degree) && (
          <section style={{ marginTop: 20 }}>
            <h3 style={{ color: p, fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Educação</h3>
            <div style={{ height: 3, width: 40, background: p, borderRadius: 4, marginBottom: 12 }} />
            <div style={{ display: 'grid', gap: 10 }}>
              {data.education.map((e, i) => (
                (e.institution || e.degree) && (
                  <div key={i}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{e.degree || 'Curso'}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{e.institution}</div>
                    {e.field && <div style={{ fontSize: 12, color: '#334155' }}>Área: {e.field}</div>}
                    {(e.startDate || e.endDate || e.current) && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        {(e.startDate || 'Início')} — {e.current ? 'Em andamento' : (e.endDate || 'Fim')}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          </section>
        )}

        {data.skills?.length > 0 && (
          <section style={{ marginTop: 20 }}>
            <h3 style={{ color: p, fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Habilidades</h3>
            <div style={{ height: 3, width: 40, background: p, borderRadius: 4, marginBottom: 12 }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {data.skills.map((s, i) => (
                <span key={i} style={{ fontSize: 11, padding: '6px 10px', borderRadius: 999, background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0' }}>{s}</span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
});

ResumePreview.displayName = 'ResumePreview';
