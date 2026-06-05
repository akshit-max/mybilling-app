const fs = require('fs');

let content = fs.readFileSync('src/app/dashboard/invoices/[id]/page.tsx', 'utf8');

// 1. Add triggerDownload function
const printFuncRegex = /setTimeout\(\(\) => \{\n\s*window\.print\(\);\n\s*\}, 150\);\n\s*\};/;
const downloadFunc = `setTimeout(() => {
      window.print();
    }, 150);
  };

  const triggerDownload = async (format: "a4" | "thermal", label: typeof activeLabel) => {
    setPrintFormat(format);
    setActiveLabel(label);
    setIsDownloadOpen(false);
    setIsPrintOpen(false);
    
    const loadingToast = toast.loading("Generating PDF...");

    setTimeout(async () => {
      try {
        const element = document.getElementById("print-container-target");
        if (!element) {
          toast.dismiss(loadingToast);
          toast.error("Could not find invoice container");
          return;
        }

        const originalDisplay = element.style.display;
        element.style.display = "block";
        element.style.position = "static";
        element.style.width = format === "thermal" ? (thermalWidth === "2" ? "58mm" : "80mm") : "210mm";

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        element.style.display = originalDisplay;
        element.style.position = "";
        element.style.width = "";

        const imgData = canvas.toDataURL("image/png");
        
        let pdf;
        if (format === "a4") {
          pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        } else {
          const tWidth = thermalWidth === "2" ? 58 : 80;
          const pdfHeight = (canvas.height * tWidth) / canvas.width;
          pdf = new jsPDF("p", "mm", [tWidth, pdfHeight]);
          pdf.addImage(imgData, "PNG", 0, 0, tWidth, pdfHeight);
        }

        pdf.save(\`Invoice_\${invoice?.invoiceNumber || id}.pdf\`);
        toast.dismiss(loadingToast);
        toast.success("PDF downloaded successfully!");

      } catch (err) {
        console.error("PDF generation error:", err);
        toast.dismiss(loadingToast);
        toast.error("Failed to generate PDF");
      }
    }, 150);
  };`;

if (!content.includes('triggerDownload')) {
  content = content.replace(printFuncRegex, downloadFunc);
}

// 2. Update triggerPrint to triggerDownload in the dropdown
content = content.replace(/triggerPrint\("a4"/g, 'triggerDownload("a4"');
content = content.replace(/triggerPrint\("thermal"/g, 'triggerDownload("thermal"');

// 3. Add id="print-container-target" to the print-only-container
content = content.replace(
  /<div className="print-only-container">/g, 
  '<div id="print-container-target" className="print-only-container">'
);

fs.writeFileSync('src/app/dashboard/invoices/[id]/page.tsx', content, 'utf8');
console.log("Updated invoices/[id]/page.tsx");
