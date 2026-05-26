import React, { useState, useEffect, useRef } from 'react';

interface SettingsPageProps {
  settings: {
    mockMode: boolean;
    enableML: boolean;
    verifyIntegrity: boolean;
    recoveryDir: string;
  };
  onSave: (settings: any) => void;
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onSave,
  onBack
}) => {
  const [mockMode, setMockMode] = useState(settings.mockMode);
  const [enableML, setEnableML] = useState(settings.enableML);
  const [verifyIntegrity, setVerifyIntegrity] = useState(settings.verifyIntegrity);
  const [recoveryDir, setRecoveryDir] = useState(settings.recoveryDir);

  const isReverting = useRef(false);
  const latestState = useRef({ mockMode, enableML, verifyIntegrity, recoveryDir });

  useEffect(() => {
    latestState.current = { mockMode, enableML, verifyIntegrity, recoveryDir };
  }, [mockMode, enableML, verifyIntegrity, recoveryDir]);

  useEffect(() => {
    return () => {
      if (!isReverting.current) {
        onSave(latestState.current);
      }
    };
  }, []);

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      setRecoveryDir(folder);
    }
  };

  const handleSave = () => {
    onSave({
      mockMode,
      enableML,
      verifyIntegrity,
      recoveryDir
    });
    isReverting.current = true;
    onBack();
  };

  const handleRevert = () => {
    isReverting.current = true;
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-surface-container-lowest">
      {/* Header */}
      <header className="flex justify-between items-center px-lg h-16 w-full border-b border-primary bg-surface flex-shrink-0">
        <div className="font-headline-md text-headline-md font-bold text-primary tracking-tight uppercase flex items-center gap-sm">
          <button 
            onClick={onBack}
            className="p-xs hover:bg-primary hover:text-on-primary border border-transparent hover:border-primary transition-colors cursor-pointer mr-sm flex items-center"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          SYSTEM_SETTINGS
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-xl">
          <div className="mb-xl border-b border-primary pb-md">
            <h2 className="font-display text-4xl text-primary tracking-tight uppercase font-bold">System Settings</h2>
            <p className="font-body-lg text-body-lg text-secondary mt-sm max-w-2xl">
              Configure data extraction rules, storage simulation options, and recovery validation parameters.
            </p>
          </div>

          <div className="flex flex-col gap-xl">
            {/* Form Section: Extraction Configuration */}
            <section className="border border-primary p-lg bg-surface">
              <h3 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-lg uppercase border-b border-primary pb-sm font-bold">
                Recovery Configuration
              </h3>
              <div className="flex flex-col gap-lg max-w-3xl">
                {/* Input Group */}
                <div className="flex flex-col gap-xs">
                  <label className="font-label-sm text-label-sm text-primary uppercase tracking-widest text-[10px]">
                    Default Recovery Destination
                  </label>
                  <div className="flex gap-2">
                    <input 
                      className="flex-grow h-12 px-md border border-primary bg-surface font-body-md text-body-md text-primary focus:outline-none focus:border-[2px] transition-none rounded-none"
                      type="text" 
                      value={recoveryDir}
                      onChange={(e) => setRecoveryDir(e.target.value)}
                    />
                    <button 
                      onClick={handleSelectFolder}
                      className="px-md bg-primary text-on-primary font-label-sm uppercase tracking-wider hover:bg-surface hover:text-primary transition-colors duration-75 border border-primary cursor-pointer"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Form Section: Toggles */}
            <section className="border border-primary p-lg bg-surface">
              <h3 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-lg uppercase border-b border-primary pb-sm font-bold">
                System Protocols
              </h3>
              <div className="flex flex-col gap-0 border border-primary border-b-0">
                {/* Toggle 1: Mock Mode */}
                <div className="flex justify-between items-center p-md border-b border-primary hover:bg-surface-container-low transition-colors duration-75">
                  <div>
                    <h4 className="font-headline-md text-headline-md text-primary uppercase font-bold text-sm">Storage Simulation Mode (Mock)</h4>
                    <p className="font-label-sm text-label-sm text-secondary uppercase mt-xs text-[10px]">
                      Simulate scans using virtual file blocks. Avoids Windows UAC prompts.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-lg">
                    <input 
                      checked={mockMode}
                      onChange={(e) => setMockMode(e.target.checked)}
                      className="sr-only" 
                      type="checkbox"
                    />
                    <div className={`w-[3.25rem] h-6 border border-primary bg-surface relative flex items-center ${mockMode ? 'bg-primary' : ''}`}>
                      <div className={`w-[20px] h-[20px] border border-primary transition-transform duration-200 ease-in-out ${
                        mockMode ? 'translate-x-[1.75rem] bg-black' : 'translate-x-[1px] bg-white'
                      }`}></div>
                    </div>
                  </label>
                </div>

                {/* Toggle 2: ML Carving */}
                <div className="flex justify-between items-center p-md border-b border-primary hover:bg-surface-container-low transition-colors duration-75">
                  <div>
                    <h4 className="font-headline-md text-headline-md text-primary uppercase font-bold text-sm">ML-Assisted Carving (Heuristics)</h4>
                    <p className="font-label-sm text-label-sm text-secondary uppercase mt-xs text-[10px]">
                      Enable byte frequency distribution analysis to detect un-signatured files.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-lg">
                    <input 
                      checked={enableML}
                      onChange={(e) => setEnableML(e.target.checked)}
                      className="sr-only" 
                      type="checkbox"
                    />
                    <div className={`w-[3.25rem] h-6 border border-primary bg-surface relative flex items-center ${enableML ? 'bg-primary' : ''}`}>
                      <div className={`w-[20px] h-[20px] border border-primary transition-transform duration-200 ease-in-out ${
                        enableML ? 'translate-x-[1.75rem] bg-black' : 'translate-x-[1px] bg-white'
                      }`}></div>
                    </div>
                  </label>
                </div>

                {/* Toggle 3: Verify Integrity */}
                <div className="flex justify-between items-center p-md border-b border-primary hover:bg-surface-container-low transition-colors duration-75">
                  <div>
                    <h4 className="font-headline-md text-headline-md text-primary uppercase font-bold text-sm">Verify Extraction Integrity</h4>
                    <p className="font-label-sm text-label-sm text-secondary uppercase mt-xs text-[10px]">
                      Perform checksum checks on recovered sectors post-extraction.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-lg">
                    <input 
                      checked={verifyIntegrity}
                      onChange={(e) => setVerifyIntegrity(e.target.checked)}
                      className="sr-only" 
                      type="checkbox"
                    />
                    <div className={`w-[3.25rem] h-6 border border-primary bg-surface relative flex items-center ${verifyIntegrity ? 'bg-primary' : ''}`}>
                      <div className={`w-[20px] h-[20px] border border-primary transition-transform duration-200 ease-in-out ${
                        verifyIntegrity ? 'translate-x-[1.75rem] bg-black' : 'translate-x-[1px] bg-white'
                      }`}></div>
                    </div>
                  </label>
                </div>
              </div>
            </section>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-md mt-lg">
              <button 
                onClick={handleRevert}
                className="h-12 px-xl border border-primary bg-surface text-primary font-label-md text-label-md uppercase tracking-wider hover:bg-primary hover:text-on-primary transition-colors cursor-pointer"
              >
                Revert Changes
              </button>
              <button 
                onClick={handleSave}
                className="h-12 px-xl border border-primary bg-primary text-on-primary font-label-md text-label-md uppercase tracking-wider hover:bg-surface hover:text-primary transition-colors cursor-pointer"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
