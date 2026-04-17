import React from 'react';
import { Shield, FileText, Lock, Globe, CheckCircle, AlertTriangle } from 'lucide-react';

export const ProtectionAudit = () => {
  const auditSections = [
    {
      title: "Legal Documents Audit",
      status: "In Progress",
      icon: <FileText className="w-5 h-5 text-blue-400" />,
      items: [
        { name: "Terms of Service", status: "Review Required" },
        { name: "Privacy Policy", status: "Compliant" },
        { name: "EULA", status: "Missing" },
        { name: "Data Processing Agreement", status: "Review Required" }
      ]
    },
    {
      title: "Data Privacy Compliance",
      status: "Warning",
      icon: <Globe className="w-5 h-5 text-yellow-400" />,
      items: [
        { name: "GDPR (Europe)", status: "Active" },
        { name: "CCPA (California)", status: "Pending" },
        { name: "DPDP Act (India)", status: "Review Required" },
        { name: "COPPA (Under 13s)", status: "N/A" }
      ]
    },
    {
      title: "IP Protection Review",
      status: "Secured",
      icon: <Lock className="w-5 h-5 text-green-400" />,
      items: [
        { name: "Trademark Search", status: "Completed" },
        { name: "Developer IP Assignment", status: "Active" },
        { name: "Open-Source Audit", status: "Completed" },
        { name: "License Compliance", status: "Compliant" }
      ]
    }
  ];

  return (
    <div className="space-y-6 text-primary-foreground font-sans">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-primary animate-pulse" />
        <h2 className="text-2xl font-bold tracking-tight">EXA-TECH PROTECTION SHIELD</h2>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {auditSections.map((section, idx) => (
          <div key={idx} className="bg-primary/5 border border-primary/20 rounded-xl p-5 hover:bg-primary/10 transition-all">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                {section.icon}
                <h3 className="font-bold text-lg">{section.title}</h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-bold uppercase ${
                section.status === 'Secured' ? 'bg-green-500/20 text-green-400' :
                section.status === 'Warning' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {section.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {section.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5">
                  <span className="text-sm opacity-80">{item.name}</span>
                  {item.status === 'Compliant' || item.status === 'Active' || item.status === 'Completed' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : item.status === 'Missing' || item.status === 'Review Required' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-primary/20 border border-primary/50 p-6 rounded-xl">
        <h4 className="font-black uppercase text-sm mb-3 tracking-widest">System-Wide Audit Log</h4>
        <div className="text-xs font-mono space-y-1 opacity-60">
          <p>[10:42:01] Running scancode-toolkit on arbiflow-os...</p>
          <p>[10:42:05] Found 234 dependencies. Licenses: MIT(211), ISC(20), Other(3).</p>
          <p>[10:42:10] IP Assignment verified for 'agent-army' core developers.</p>
          <p>[10:42:15] Protection Shield V1.0 active across all EXA-TECH assets.</p>
        </div>
      </div>
    </div>
  );
};
