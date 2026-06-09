"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function PrivacyPolicy() {
  const [content, setContent] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("June 9, 2026");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const snap = await getDoc(doc(db, "platformSettings", "legal"));
        if (snap.exists() && snap.data().privacyPolicy) {
          const fetchedContent = snap.data().privacyPolicy;
          const isHtml = (str: string) => str.includes("<h1") || str.includes("<section");
          
          if (!isHtml(fetchedContent)) {
            setContent(fetchedContent);
          }
          
          if (snap.data().updatedAt) {
            setLastUpdated(new Date(snap.data().updatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch custom privacy policy", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto px-6 bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100">
        <Link href="/" className="text-brand-primary hover:text-brand-secondary font-bold text-sm mb-8 inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-extrabold text-brand-primary mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8 font-medium">Last Updated: {lastUpdated}</p>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        ) : content ? (
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-medium">
            {content}
          </div>
        ) : (
          <div className="whitespace-pre-wrap text-gray-700 leading-relaxed font-medium">
{`1. Introduction
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
- Contact Number: +91 88911 77850 17400`}
          </div>
        )}
      </div>
    </div>
  );
}
