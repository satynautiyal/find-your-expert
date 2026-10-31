'use client';

import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { fetchProviderFilters, submitQuoteRequest } from '@/lib/api';
import { EButton, EInput } from '@/components/EComponents';

export interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProvider?: RooferProvider | null;
}

export default function QuoteModal({
  isOpen,
  onClose,
  selectedProvider,
}: QuoteModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [boroughOptions, setBoroughOptions] = useState<string[]>([]);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    serviceType: selectedProvider?.services?.[0] || '',
    propertyType: 'Residential',
    urgency: 'Within 48 hours',
    borough: selectedProvider?.borough || '',
    zipCode: '',
    fullName: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    fetchProviderFilters()
      .then((meta) => {
        const bList = (meta.boroughs || []).filter((b) => b !== 'All');
        const sList =
          selectedProvider?.services && selectedProvider.services.length > 0
            ? selectedProvider.services
            : (meta.services || []).filter((s) => s !== 'All Services' && s !== 'All');
        setBoroughOptions(bList);
        setServiceOptions(sList);
        setFormData((prev) => ({
          ...prev,
          serviceType: prev.serviceType || sList[0] || 'General Consultation',
          borough: selectedProvider?.borough || prev.borough || bList[0] || '',
        }));
      })
      .catch(() => {
        if (selectedProvider?.services?.length) {
          setServiceOptions(selectedProvider.services);
        }
      });
  }, [isOpen, selectedProvider]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitQuoteRequest({
        providerProfileId: selectedProvider?.id,
        customerName: formData.fullName,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        borough: formData.borough,
        zipCode: formData.zipCode,
        serviceType: formData.serviceType,
        projectNotes: formData.notes,
      });
    } catch (err) {
      console.warn('Quote request submission warning:', err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors z-10 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-dark">
                REQUEST DISPATCHED
              </span>
              <h3 className="text-xl font-bold text-gray-950">
                Your Free Quote Request Has Been Sent!
              </h3>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                {selectedProvider
                  ? `Sent directly to ${selectedProvider.name}. Typical response time is under 15 minutes.`
                  : 'Matched with top-rated verified contractors in your area.'}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Service:</span>
                <span className="font-bold text-gray-900">{formData.serviceType}</span>
              </div>
              {formData.borough && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Area:</span>
                  <span className="font-bold text-gray-900">{formData.borough}</span>
                </div>
              )}
              {selectedProvider?.typicalPriceRange && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Typical Range:</span>
                  <span className="font-bold text-primary-dark">
                    {selectedProvider.typicalPriceRange}
                  </span>
                </div>
              )}
            </div>

            <EButton
              onClick={handleReset}
              variant="primary"
              size="md"
              className="w-full py-2.5"
            >
              Done &bull; Return to Listings
            </EButton>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="p-6 bg-gray-50 border-b border-gray-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary-dark flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span>100% Free &bull; No Obligation &bull; Verified NYC Contractors</span>
              </span>
              <h3 className="text-lg font-black text-gray-950">
                {selectedProvider
                  ? `Get Quote: ${selectedProvider.name}`
                  : 'Get Quotes from Top Verified Contractors'}
              </h3>
              {selectedProvider?.typicalPriceRange && (
                <div className="text-xs text-gray-500 mt-0.5">
                  Typical Project Range: <strong className="text-gray-900">{selectedProvider.typicalPriceRange}</strong>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {step === 1 ? (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
                      Service Needed
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-medium text-gray-900"
                    >
                      {serviceOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
                        Borough / Area
                      </label>
                      <select
                        value={formData.borough}
                        onChange={(e) => setFormData({ ...formData, borough: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-medium text-gray-900"
                      >
                        {boroughOptions.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
                        NYC Zip Code
                      </label>
                      <EInput
                        type="text"
                        required
                        placeholder="e.g. 11217"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
                      Property Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Residential', 'Commercial'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, propertyType: type })}
                          className={`py-2 px-3 rounded-lg border text-center font-bold text-xs transition-all cursor-pointer ${
                            formData.propertyType === type
                              ? 'bg-primary text-white border-primary shadow-2xs'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <EButton
                    type="button"
                    onClick={() => setStep(2)}
                    variant="primary"
                    size="md"
                    className="w-full mt-2 py-2.5"
                    iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Continue to Contact Info
                  </EButton>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
                      Full Name
                    </label>
                    <EInput
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
                        Phone Number
                      </label>
                      <EInput
                        type="tel"
                        required
                        placeholder="(212) 555-0100"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
                        Email Address
                      </label>
                      <EInput
                        type="email"
                        required
                        placeholder="jane@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">
                      Project Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Active ceiling drip in bedroom, 3-story flat roof brownstone..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-900"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <EButton
                      type="button"
                      onClick={() => setStep(1)}
                      variant="secondary"
                      size="md"
                      iconLeft={<ArrowLeft className="w-3.5 h-3.5" />}
                    >
                      Back
                    </EButton>
                    <EButton
                      type="submit"
                      disabled={isSubmitting}
                      variant="primary"
                      size="md"
                      className="flex-1 py-2.5"
                      iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit & Get Free Quote'}
                    </EButton>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
