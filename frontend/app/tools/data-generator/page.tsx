'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Database, ArrowLeft, Copy, Check, RefreshCw, Plus, Download, User, Mail, Phone, MapPin, Building, Calendar, CreditCard, Globe } from 'lucide-react';
import { gsap, ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase } from '@/lib/gsap';

gsap.registerPlugin(ScrollTrigger, SplitText, TextPlugin, CustomWiggle, CustomEase);

interface GeneratedData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  company: string;
  jobTitle: string;
  dateOfBirth: string;
  creditCard: string;
  uuid: string;
  ipAddress: string;
  username: string;
  password: string;
}

const firstNames = ['James', 'Emma', 'Oliver', 'Sophia', 'William', 'Ava', 'Benjamin', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander', 'Amelia', 'Daniel', 'Harper'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin'];
const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'proton.me', 'icloud.com', 'example.com', 'company.com'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville'];
const countries = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia', 'Japan', 'Brazil', 'India', 'Mexico'];
const companies = ['TechCorp', 'InnoSoft', 'DataDrive', 'CloudNine', 'ByteWorks', 'NetPlex', 'DigiFlow', 'CodeBase', 'SynergyAI', 'NexGen Solutions'];
const jobTitles = ['Software Engineer', 'Product Manager', 'Data Analyst', 'UX Designer', 'DevOps Engineer', 'Marketing Manager', 'Sales Director', 'HR Specialist', 'Financial Analyst', 'Project Manager'];
const streets = ['Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St', 'Washington Blvd', 'Park Ave', 'Lake View Dr', 'Highland Ave'];

export default function DataGeneratorPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [count, setCount] = useState(5);
  const [generatedData, setGeneratedData] = useState<GeneratedData[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState({
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    address: true,
    city: true,
    country: true,
    company: true,
    jobTitle: true,
    dateOfBirth: true,
    creditCard: false,
    uuid: true,
    ipAddress: true,
    username: true,
    password: false,
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      CustomWiggle.create('dataWiggle', { wiggles: 6, type: 'easeOut' });

      gsap.to('.data-gradient-orb', {
        x: 'random(-60, 60)',
        y: 'random(-30, 30)',
        scale: 'random(0.9, 1.15)',
        duration: 5.5,
        ease: 'sine.inOut',
        stagger: { each: 0.7, repeat: -1, yoyo: true },
      });

      // Floating symbols
      const symbols = document.querySelectorAll('.floating-data-symbol');
      symbols.forEach((el, i) => {
        gsap.to(el, {
          y: -20 - i * 5,
          rotation: i % 2 === 0 ? 10 : -10,
          duration: 3 + i * 0.3,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
        });
      });

      if (titleRef.current) {
        const split = new SplitText(titleRef.current, { type: 'chars' });
        gsap.from(split.chars, {
          opacity: 0,
          y: 50,
          rotationX: -90,
          stagger: 0.03,
          duration: 0.6,
          ease: 'back.out(1.7)',
          delay: 0.2,
        });
      }

      gsap.to('.hero-data-icon', {
        boxShadow: '0 0 50px rgba(139, 92, 246, 0.5)',
        scale: 1.05,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.from('.data-panel', {
        opacity: 0,
        y: 30,
        stagger: 0.12,
        duration: 0.6,
        delay: 0.5,
        ease: 'power3.out',
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const generatePerson = (): GeneratedData => {
    const firstName = random(firstNames);
    const lastName = random(lastNames);
    const domain = random(domains);

    return {
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomInt(1, 99)}@${domain}`,
      phone: `+1 (${randomInt(200, 999)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
      address: `${randomInt(100, 9999)} ${random(streets)}`,
      city: random(cities),
      country: random(countries),
      company: random(companies),
      jobTitle: random(jobTitles),
      dateOfBirth: `${randomInt(1970, 2005)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
      creditCard: `${randomInt(4000, 4999)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)} ${randomInt(1000, 9999)}`,
      uuid: crypto.randomUUID(),
      ipAddress: `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`,
      username: `${firstName.toLowerCase()}${lastName.toLowerCase().charAt(0)}${randomInt(1, 999)}`,
      password: generatePassword(),
    };
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  const generateData = () => {
    const data = Array.from({ length: count }, () => generatePerson());
    setGeneratedData(data);
    gsap.fromTo('.generate-btn', { scale: 0.9 }, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
    gsap.from('.data-row', { opacity: 0, x: -20, stagger: 0.05, duration: 0.3 });
  };

  const copyValue = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportAsJSON = () => {
    const filteredData = generatedData.map((item) => {
      const filtered: Partial<GeneratedData> = {};
      Object.entries(selectedFields).forEach(([key, selected]) => {
        if (selected) {
          filtered[key as keyof GeneratedData] = item[key as keyof GeneratedData];
        }
      });
      return filtered;
    });

    const blob = new Blob([JSON.stringify(filteredData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const headers = Object.entries(selectedFields)
      .filter(([, selected]) => selected)
      .map(([key]) => key);

    const rows = generatedData.map((item) =>
      headers.map((key) => `"${item[key as keyof GeneratedData]}"`).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleField = (field: keyof typeof selectedFields) => {
    setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const fieldIcons: Record<string, React.ReactNode> = {
    firstName: <User className="w-4 h-4" />,
    lastName: <User className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    phone: <Phone className="w-4 h-4" />,
    address: <MapPin className="w-4 h-4" />,
    city: <MapPin className="w-4 h-4" />,
    country: <Globe className="w-4 h-4" />,
    company: <Building className="w-4 h-4" />,
    jobTitle: <Building className="w-4 h-4" />,
    dateOfBirth: <Calendar className="w-4 h-4" />,
    creditCard: <CreditCard className="w-4 h-4" />,
    uuid: <Database className="w-4 h-4" />,
    ipAddress: <Globe className="w-4 h-4" />,
    username: <User className="w-4 h-4" />,
    password: <CreditCard className="w-4 h-4" />,
  };

  return (
    <div ref={containerRef} className="min-h-screen">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="data-gradient-orb absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-r from-purple-600/20 to-violet-600/20 blur-[100px]" />
        <div className="data-gradient-orb absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-gradient-to-r from-indigo-600/15 to-blue-600/15 blur-[80px]" />
      </div>

      {/* Floating Symbols */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {['{}', '[]', 'null', '"id"', '0x3F', 'fn()'].map((sym, i) => (
          <div
            key={i}
            className="floating-data-symbol absolute text-lg font-mono text-white/10"
            style={{ left: `${8 + i * 15}%`, top: `${15 + (i % 3) * 28}%` }}
          >
            {sym}
          </div>
        ))}
      </div>

      <section className="relative py-12 border-b border-white/[0.06]">
        <div className="container mx-auto px-4">
          <Link href="/tools" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Tools
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div className="hero-data-icon w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/30 to-violet-600/30 border border-purple-500/30 flex items-center justify-center">
              <Database className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 ref={titleRef} className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
                <span style={{ background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Data Generator</span>
              </h1>
              <p className="text-gray-400">
                Generate realistic mock data for testing and development
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="data-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 sticky top-6">
              <h3 className="font-semibold text-white mb-4">Configuration</h3>

              <div className="mb-6">
                <label className="text-sm text-gray-400 mb-2 block">Number of Records</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-white font-mono w-8 text-center">{count}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="text-sm text-gray-400 mb-3 block">Fields to Generate</label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {Object.entries(selectedFields).map(([field, selected]) => (
                    <button
                      key={field}
                      onClick={() => toggleField(field as keyof typeof selectedFields)}
                      className={`w-full p-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors ${selected
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : 'bg-[#0d0d12] text-gray-500 border border-white/[0.04] hover:bg-white/[0.04]'
                        }`}
                    >
                      {fieldIcons[field]}
                      <span className="capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateData}
                className="generate-btn w-full py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 text-white rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Generate Data
              </button>

              {generatedData.length > 0 && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={exportAsJSON}
                    className="flex-1 py-2 bg-white/[0.02] hover:bg-white/[0.06] text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    JSON
                  </button>
                  <button
                    onClick={exportAsCSV}
                    className="flex-1 py-2 bg-white/[0.02] hover:bg-white/[0.06] text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-3">
            {generatedData.length === 0 ? (
              <div className="data-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center">
                <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Data Generated</h3>
                <p className="text-gray-400 mb-6">Configure your fields and click Generate to create mock data</p>
                <button
                  onClick={generateData}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl inline-flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Generate Data
                </button>
              </div>
            ) : (
              <div className="data-panel bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                  <h3 className="font-semibold text-white">
                    Generated Records ({generatedData.length})
                  </h3>
                  <button
                    onClick={() => {
                      const filteredData = generatedData.map((item) => {
                        const filtered: Partial<GeneratedData> = {};
                        Object.entries(selectedFields).forEach(([key, selected]) => {
                          if (selected) {
                            filtered[key as keyof GeneratedData] = item[key as keyof GeneratedData];
                          }
                        });
                        return filtered;
                      });
                      copyValue(JSON.stringify(filteredData, null, 2), 'all');
                    }}
                    className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm transition-colors flex items-center gap-1"
                  >
                    {copied === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    Copy All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-[#0d0d12] sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
                          {Object.entries(selectedFields)
                            .filter(([, selected]) => selected)
                            .map(([field]) => (
                              <th key={field} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase whitespace-nowrap">
                                {field.replace(/([A-Z])/g, ' $1').trim()}
                              </th>
                            ))}
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {generatedData.map((item, index) => (
                          <tr key={index} className="data-row hover:bg-white/[0.04] transition-colors">
                            <td className="px-4 py-3 text-gray-500 text-sm">{index + 1}</td>
                            {Object.entries(selectedFields)
                              .filter(([, selected]) => selected)
                              .map(([field]) => (
                                <td key={field} className="px-4 py-3 text-white text-sm font-mono whitespace-nowrap">
                                  {item[field as keyof GeneratedData]}
                                </td>
                              ))}
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  const filtered: Partial<GeneratedData> = {};
                                  Object.entries(selectedFields).forEach(([key, selected]) => {
                                    if (selected) {
                                      filtered[key as keyof GeneratedData] = item[key as keyof GeneratedData];
                                    }
                                  });
                                  copyValue(JSON.stringify(filtered), `row-${index}`);
                                }}
                                className="p-1.5 hover:bg-white/[0.06] rounded transition-colors"
                              >
                                {copied === `row-${index}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
