"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Save, FileText, CheckCircle2 } from "lucide-react";

const DEFAULT_PRIVACY = `1. Introduction
Cloud Ledger is a SaaS billing, invoicing, inventory, and business management platform.

We are committed to protecting your personal and business data. This Privacy Policy explains how your data is collected, used, and safeguarded when you use our platform.

2. Information Collected
When you use Cloud Ledger, we collect the following types of information:
- User name, Email address, and Phone number
- Business name and GST/Tax details
- Billing and invoice records
- Customer and supplier information entered by users
- Payment transaction information
- Device, browser, IP address, and usage analytics

3. How Data Is Used
We use the collected data for the following purposes:
- Account creation and management
- Invoice and billing operations
- Inventory management
- Customer support
- Platform improvements
- Security monitoring
- Notifications and service communications

4. Data Storage & Security
- Secure cloud storage with restricted access
- Encryption where applicable for sensitive data
- Strict access controls and monitoring
- Regular backup procedures to prevent data loss

5. Data Sharing
We may share necessary data with trusted third parties to provide our services:
- Payment gateway providers
- Hosting providers
- SMS/Email service providers
- When required by legal and regulatory compliance

6. Cookies & Analytics
- Session management and Login persistence
- Performance tracking and Analytics collection

7. User Rights
- View and Edit account data
- Export business data
- Request account deletion

8. Data Retention
We store your data as long as your account is active or as required by applicable laws. Upon account closure, data deletion processes are initiated subject to legal and operational requirements.

9. Third-Party Services
Our platform integrates with third-party services including Payment gateways, Email services, SMS providers, and Cloud infrastructure.

10. Contact Information
For any privacy-related queries, please contact us:
- Support Email: support@cloudledger.com
- Company Address: Cloud Ledger HQ, Mumbai, India
- Contact Number: +91 88911 77850`;

const DEFAULT_TERMS = `1. Acceptance of Terms
Users agree to these terms by using the Cloud Ledger platform.

2. Account Registration
- Accurate information is required for registration.
- Users are responsible for maintaining account credentials.
- Account sharing is strictly prohibited.

3. Subscription & Billing
- Pricing plans are subject to change.
- Renewal processes are automated unless canceled.
- Payment terms apply as specified at checkout.
- Subscription cancellation must be done before the next billing cycle.

4. User Responsibilities
- Accuracy of business records and invoices.
- Tax and GST compliance.
- Maintaining account security.

5. Acceptable Use
Users may use the platform for:
- Billing, Invoicing, and Inventory management
- Accounting records and Business operations

Prohibited Activities include:
- Illegal activities or Unauthorized access attempts
- Reverse engineering or Data scraping
- Platform abuse or Uploading malicious content

6. Data Ownership & Intellectual Property
- Users own all business data entered into the platform.
- Cloud Ledger owns the software, design, branding, and source code.
- Intellectual Property includes Cloud Ledger name, logo, UI designs, software code, and documentation.

7. Third-Party Integrations & Service Availability
- Integrations include Payment gateway, SMS services, Email services, and Other APIs.
- Service may be affected by maintenance windows and temporary downtime.
- We do not guarantee 100% uninterrupted service.

8. Limitation of Liability
Cloud Ledger is not responsible for:
- Incorrect user-entered data
- Tax filing errors
- Business losses
- Third-party service failures

9. Account Suspension & Termination
We reserve the right to suspend or terminate accounts for:
- Violation of terms
- Fraudulent activities
- Non-payment of subscriptions

10. Refund Policy
Subscriptions are generally non-refundable unless legally required or specifically outlined in your pricing plan terms.

11. Governing Law & Changes
These terms are governed by the laws of India. Jurisdiction to be specified by the company in Mumbai, India.
We may update these terms periodically. Continued use of the platform implies acceptance of updated terms.

IMPORTANT DISCLAIMERS

GST Disclaimer
Cloud Ledger provides tools for billing and tax calculations. Users are solely responsible for ensuring compliance with applicable tax laws and regulations.

Invoice Accuracy Disclaimer
Users are responsible for verifying invoice details before sharing or printing.

Data Backup Disclaimer
While Cloud Ledger maintains backups, users are encouraged to retain copies of critical business records.

Payment Gateway Disclaimer
Cloud Ledger is not responsible for failures, delays, or errors caused by third-party payment providers.

SMS / Email Delivery Disclaimer
Delivery of notifications depends on third-party providers and cannot be guaranteed.

SaaS Service Disclaimer
Service availability may be affected by maintenance, updates, infrastructure issues, or circumstances beyond our control.

Non-Affiliation Clause
Cloud Ledger is an independently developed software platform. Any similarity in features, workflows, or business processes to other billing, accounting, inventory, or business management software is based on common industry practices and does not imply any affiliation, endorsement, sponsorship, or association with any third-party product or service.

Contact Information
- Support Email: support@cloudledger.com
- Company Address: Cloud Ledger HQ, Mumbai, India
- Contact Details: +91 88911 77850`;

export default function LegalCMS() {
  const [privacyPolicy, setPrivacyPolicy] = useState(DEFAULT_PRIVACY);
  const [termsAndConditions, setTermsAndConditions] = useState(DEFAULT_TERMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchLegalData = async () => {
      try {
        const snap = await getDoc(doc(db, "platformSettings", "legal"));
        if (snap.exists()) {
          const data = snap.data();
          
          // Ignore previously saved HTML placeholders to force the plain text default
          const isHtml = (str: string) => str.includes("<h1") || str.includes("<section");
          
          if (data.privacyPolicy && !isHtml(data.privacyPolicy)) {
            setPrivacyPolicy(data.privacyPolicy);
          }
          if (data.termsAndConditions && !isHtml(data.termsAndConditions)) {
            setTermsAndConditions(data.termsAndConditions);
          }
        }
      } catch (err) {
        console.error("Failed to fetch legal settings", err);
        toast.error("Failed to load existing legal pages.");
      } finally {
        setLoading(false);
      }
    };
    fetchLegalData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await setDoc(doc(db, "platformSettings", "legal"), {
        privacyPolicy,
        termsAndConditions,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success("Legal pages updated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading legal settings...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <FileText className="text-[#F97316]" size={32} />
            Legal Pages CMS
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            Update the content for Privacy Policy and Terms & Conditions. You can use plain text format.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#F97316] hover:bg-[#ea580c] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-[#F97316]/20 transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Privacy Policy Editor */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#F97316]" />
              Privacy Policy Content
            </h2>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <textarea
              className="w-full h-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/50 font-mono text-sm text-slate-700 transition"
              placeholder="1. Privacy Policy\n\nContent goes here..."
              value={privacyPolicy}
              onChange={(e) => setPrivacyPolicy(e.target.value)}
            />
          </div>
        </div>

        {/* Terms and Conditions Editor */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#F97316]" />
              Terms & Conditions Content
            </h2>
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <textarea
              className="w-full h-full flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl resize-none outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]/50 font-mono text-sm text-slate-700 transition"
              placeholder="1. Terms & Conditions\n\nContent goes here..."
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
