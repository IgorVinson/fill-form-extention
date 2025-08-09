// Simple test to fill basic fields with your CV data
console.log("🧪 Simple Test Loaded - Testing direct form fill");

// Your CV data (hardcoded for testing)
const testCVData = {
  name: "IGOR VINSON",
  email: "igorvinson@gmail.com", 
  phone: "(509) 609-9820",
  location: "Raleigh, NC"
};

// Simple function to fill obvious fields
function fillBasicFields() {
  console.log("🔍 Looking for basic form fields...");
  
  // Find name fields
  const nameFields = document.querySelectorAll('input[type="text"], input[name*="name"], input[id*="name"], input[placeholder*="name"]');
  nameFields.forEach(field => {
    if (field.placeholder?.toLowerCase().includes('name') || field.name?.toLowerCase().includes('name') || field.id?.toLowerCase().includes('name')) {
      field.value = testCVData.name;
      field.dispatchEvent(new Event('input', {bubbles: true}));
      field.dispatchEvent(new Event('change', {bubbles: true}));
      console.log("✅ Filled name field:", field);
    }
  });
  
  // Find email fields
  const emailFields = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]');
  emailFields.forEach(field => {
    field.value = testCVData.email;
    field.dispatchEvent(new Event('input', {bubbles: true}));
    field.dispatchEvent(new Event('change', {bubbles: true}));
    console.log("✅ Filled email field:", field);
  });
  
  // Find phone fields
  const phoneFields = document.querySelectorAll('input[type="tel"], input[name*="phone"], input[id*="phone"], input[placeholder*="phone"]');
  phoneFields.forEach(field => {
    if (field.type === 'tel' || field.name?.toLowerCase().includes('phone') || field.placeholder?.toLowerCase().includes('phone')) {
      field.value = testCVData.phone;
      field.dispatchEvent(new Event('input', {bubbles: true}));
      field.dispatchEvent(new Event('change', {bubbles: true}));
      console.log("✅ Filled phone field:", field);
    }
  });
  
  console.log("🎯 Simple fill completed!");
}

// Add to window so you can call it from console
window.fillBasicFields = fillBasicFields;

// Auto-run after 2 seconds
setTimeout(fillBasicFields, 2000);