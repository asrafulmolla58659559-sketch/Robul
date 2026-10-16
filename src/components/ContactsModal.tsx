import React, { useState } from 'react';
import { X, Phone, UserPlus, Trash2, Search, User } from 'lucide-react';
import { Contact } from '../types';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onAddContact: (contact: { name: string; number: string }) => void;
  onDeleteContact: (id: string) => void;
  onCallContact: (contact: Contact) => void;
}

export const ContactsModal: React.FC<ContactsModalProps> = ({
  isOpen,
  onClose,
  contacts,
  onAddContact,
  onDeleteContact,
  onCallContact,
}) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim()) return;
    onAddContact({ name: name.trim(), number: number.trim() });
    setName('');
    setNumber('');
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.number.includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">ফোনবুক ও কন্টাক্টস</h2>
              <p className="text-xs text-slate-400">নাম ধরে বললেই সরাসরি ডায়াল করবে</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add Contact Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5 mb-4 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5 text-blue-400" /> নতুন কন্টাক্ট যুক্ত করুন
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="নাম (যেমন: মা, রহিম)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="tel"
              placeholder="নম্বর (যেমন: 01700000000)"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-600/20"
          >
            <UserPlus className="w-3.5 h-3.5" /> সংরক্ষণ করুন
          </button>
        </form>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="কন্টাক্ট খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              কোনো কন্টাক্ট পাওয়া যায়নি
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow">
                    {contact.name.slice(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{contact.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono">{contact.number}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onCallContact(contact)}
                    className="bg-emerald-600/90 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1 transition shadow-sm"
                    title="কল করুন"
                  >
                    <Phone className="w-3 h-3" /> কল
                  </button>
                  <button
                    onClick={() => onDeleteContact(contact.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition"
                    title="মুছুন"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
