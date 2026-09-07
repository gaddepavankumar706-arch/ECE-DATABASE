/**
 * SBTET Student Connect - Core Controller & SPA Router
 */

import {
  auth,
  db,
  googleProvider,
  isConfigPlaceholder
} from "./firebase-config.js";

import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ==========================================================================
   State Management
   ========================================================================== */

const state = {
  currentUser: null,
  studentProfile: null,
  activeTab: "tab-overview"
};

/* ==========================================================================
   DOM Elements Cache
   ========================================================================== */

const DOM = {
  // Screens
  loader: document.getElementById("screen-loader"),
  loaderText: document.getElementById("loader-status-text"),
  toastContainer: document.getElementById("toast-container"),

  viewAuth: document.getElementById("view-auth"),
  viewSetup: document.getElementById("view-setup"),
  viewDashboard: document.getElementById("view-dashboard"),

  // Authentication
  btnGoogleLogin: document.getElementById("btn-google-login"),

  // Setup View
  setupAvatar: document.getElementById("setup-avatar"),
  setupEmail: document.getElementById("setup-user-email"),
  formSetup: document.getElementById("form-profile-setup"),
  btnSaveProfile: document.getElementById("btn-save-profile"),

  // Setup Inputs
  setupName: document.getElementById("setup-name"),
  setupPin: document.getElementById("setup-pin"),
  setupBranch: document.getElementById("setup-branch"),
  setupScheme: document.getElementById("setup-scheme"),
  setupCollege: document.getElementById("setup-college"),
  setupAcademicYear: document.getElementById("setup-academic-year"),
  setupCurrentYear: document.getElementById("setup-current-year"),

  // Setup Error Spans
  errSetupName: document.getElementById("err-setup-name"),
  errSetupPin: document.getElementById("err-setup-pin"),
  errSetupBranch: document.getElementById("err-setup-branch"),
  errSetupScheme: document.getElementById("err-setup-scheme"),
  errSetupCollege: document.getElementById("err-setup-college"),
  errSetupAcademicYear: document.getElementById("err-setup-academic-year"),
  errSetupCurrentYear: document.getElementById("err-setup-current-year"),

  // Dashboard Overview
  dashGreeting: document.getElementById("dash-greeting"),
  dashUserAvatar: document.getElementById("dash-user-avatar"),
  dashPillName: document.getElementById("dash-pill-name"),
  dashPillPin: document.getElementById("dash-pill-pin"),

  dashCardName: document.getElementById("dash-card-name"),
  dashCardPin: document.getElementById("dash-card-pin"),
  dashCardCollege: document.getElementById("dash-card-college"),
  dashCardScheme: document.getElementById("dash-card-scheme"),
  dashCardBranch: document.getElementById("dash-card-branch"),
  dashCardYear: document.getElementById("dash-card-year"),
  dashCardAcYear: document.getElementById("dash-card-ac-year"),
  dashIdAvatar: document.getElementById("dash-id-avatar"),

  // Profile Edit
  formProfileEdit: document.getElementById("form-profile-edit"),
  editAvatarPreview: document.getElementById("edit-avatar-preview"),
  editAvatarName: document.getElementById("edit-avatar-name"),
  editAvatarEmail: document.getElementById("edit-avatar-email"),
  editName: document.getElementById("edit-name"),
  editPin: document.getElementById("edit-pin"),
  editBranch: document.getElementById("edit-branch"),
  editScheme: document.getElementById("edit-scheme"),
  editCollege: document.getElementById("edit-college"),
  editAcademicYear: document.getElementById("edit-academic-year"),
  editCurrentYear: document.getElementById("edit-current-year"),
  btnUpdateProfile: document.getElementById("btn-update-profile"),
  btnProfileLogout: document.getElementById("btn-profile-logout"),
  btnSidebarLogout: document.getElementById("btn-sidebar-logout")
};

/* ==========================================================================
   Safe DOM Helpers
   ========================================================================== */

function setText(element, value) {
  if (element) element.textContent = value ?? "";
}

function setSrc(element, value) {
  if (element) element.src = value || "";
}

function setValue(element, value) {
  if (element) element.value = value ?? "";
}

function addClickListener(element, callback) {
  if (element) element.addEventListener("click", callback);
}

/* ==========================================================================
   UI Helpers
   ========================================================================== */

export function showToast(message, type = "info", duration = 3000) {
  if (!DOM.toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let iconClass = "fa-circle-info";
  if (type === "success") iconClass = "fa-circle-check";
  if (type === "error") iconClass = "fa-circle-exclamation";
  if (type === "warning") iconClass = "fa-triangle-exclamation";

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${escapeHTML(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, function (m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m];
  });
}

function setScreen(screenName) {
  if (DOM.viewAuth) DOM.viewAuth.classList.remove("active");
  if (DOM.viewSetup) DOM.viewSetup.classList.remove("active");
  if (DOM.viewDashboard) DOM.viewDashboard.classList.remove("active");

  if (screenName === "auth" && DOM.viewAuth) DOM.viewAuth.classList.add("active");
  if (screenName === "setup" && DOM.viewSetup) DOM.viewSetup.classList.add("active");
  if (screenName === "dashboard" && DOM.viewDashboard) DOM.viewDashboard.classList.add("active");
}

function hideLoader() {
  if (DOM.loader) DOM.loader.classList.add("fade-out");
}

function showLoader(statusMessage = "Loading SBTET Connect...") {
  if (DOM.loaderText) DOM.loaderText.textContent = statusMessage;
  if (DOM.loader) DOM.loader.classList.remove("fade-out");
}

/* ==========================================================================
   Validation
   ========================================================================== */

function validatePIN(pin) {
  const cleanPin = String(pin || "").trim().toUpperCase();
  const pinRegex = /^[0-9]{2}[0-9]{3,4}-?[A-Z]{1,3}-?[0-9]{3,4}$/;

  if (!cleanPin) {
    return { valid: false, message: "PIN is required." };
  }
  if (cleanPin.length < 9 || !pinRegex.test(cleanPin)) {
    return { valid: false, message: "Invalid SBTET PIN format (e.g. 21001-EC-001)." };
  }
  return { valid: true, sanitized: cleanPin };
}

/* ==========================================================================
   Direct SBTET Connect Launcher
   ========================================================================== */

export async function openSBTETConnect(route = "home") {
  const pin = state.studentProfile?.pin;

  if (!pin || pin === "N/A") {
    showToast("Student PIN not found. Please complete profile.", "error");
    return;
  }

  // Copy PIN to clipboard automatically
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(pin);
    } else {
      const fallbackInput = document.createElement("textarea");
      fallbackInput.value = pin;
      fallbackInput.style.position = "fixed";
      fallbackInput.style.opacity = "0";
      document.body.appendChild(fallbackInput);
      fallbackInput.select();
      document.execCommand("copy");
      document.body.removeChild(fallbackInput);
    }
  } catch (err) {
    console.warn("Clipboard access warning:", err);
  }

  const encodedPin = encodeURIComponent(pin);
  let targetUrl = `https://sbtetconnect.app/?pin=${encodedPin}`;

  if (route === "results") {
    targetUrl = `https://sbtetconnect.app/results?pin=${encodedPin}`;
  } else if (route === "attendance") {
    targetUrl = `https://sbtetconnect.app/attendance?pin=${encodedPin}`;
  }

  showToast(`Copied PIN (${pin}). Opening SBTET Connect...`, "success", 2000);

  setTimeout(() => {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }, 250);
}

/* ==========================================================================
   Google Authentication
   ========================================================================== */

addClickListener(DOM.btnGoogleLogin, async () => {
  if (isConfigPlaceholder) {
    showToast("Please enter your Firebase credentials in firebase-config.js", "error", 6000);
    return;
  }

  try {
    showLoader("Connecting to Google Account...");
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    hideLoader();
    if (error.code === "auth/popup-closed-by-user") {
      showToast("Sign in popup was closed.", "warning");
    } else {
      showToast(`Login Failed: ${error.message}`, "error");
    }
  }
});

async function handleSignOut() {
  try {
    showLoader("Signing out...");
    await signOut(auth);
    state.currentUser = null;
    state.studentProfile = null;
    setScreen("auth");
    showToast("You have been signed out.", "info");
  } catch (error) {
    console.error("Sign Out Error:", error);
    showToast("Failed to sign out.", "error");
  } finally {
    hideLoader();
  }
}

addClickListener(DOM.btnProfileLogout, handleSignOut);
addClickListener(DOM.btnSidebarLogout, handleSignOut);

/* ==========================================================================
   Auth State Listener
   ========================================================================== */

onAuthStateChanged(auth, async (user) => {
  if (isConfigPlaceholder) {
    hideLoader();
    setScreen("auth");
    return;
  }

  if (!user) {
    state.currentUser = null;
    state.studentProfile = null;
    hideLoader();
    setScreen("auth");
    return;
  }

  state.currentUser = user;
  showLoader("Verifying student profile...");

  try {
    const studentDocRef = doc(db, "students", user.uid);
    const studentSnapshot = await getDoc(studentDocRef);

    if (studentSnapshot.exists()) {
      state.studentProfile = studentSnapshot.data();
      populateDashboardUI(state.studentProfile, user);
      setScreen("dashboard");
      switchTab("tab-overview");
    } else {
      prepareProfileSetupForm(user);
      setScreen("setup");
    }
  } catch (firestoreError) {
    console.error("Firestore Error:", firestoreError);
    showToast("Failed to fetch student record.", "error");
    setScreen("auth");
  } finally {
    hideLoader();
  }
});

/* ==========================================================================
   Profile Setup
   ========================================================================== */

function prepareProfileSetupForm(user) {
  const fallbackAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";
  setSrc(DOM.setupAvatar, user?.photoURL || fallbackAvatar);
  setText(DOM.setupEmail, user?.email || "No Email Provided");
  setValue(DOM.setupName, user?.displayName || "");
}

if (DOM.formSetup) {
  DOM.formSetup.addEventListener("submit", async (e) => {
    e.preventDefault();

    setText(DOM.errSetupName, "");
    setText(DOM.errSetupPin, "");
    setText(DOM.errSetupBranch, "");
    setText(DOM.errSetupScheme, "");
    setText(DOM.errSetupCollege, "");
    setText(DOM.errSetupAcademicYear, "");
    setText(DOM.errSetupCurrentYear, "");

    const name = DOM.setupName?.value.trim() || "";
    const rawPin = DOM.setupPin?.value.trim() || "";
    const branch = DOM.setupBranch?.value || "";
    const scheme = DOM.setupScheme?.value || "";
    const college = DOM.setupCollege?.value.trim() || "";
    const academicYear = DOM.setupAcademicYear?.value || "";
    const currentYear = DOM.setupCurrentYear?.value || "";

    let hasError = false;

    if (!name) {
      setText(DOM.errSetupName, "Please enter your full name.");
      hasError = true;
    }

    const pinValidation = validatePIN(rawPin);
    if (!pinValidation.valid) {
      setText(DOM.errSetupPin, pinValidation.message);
      hasError = true;
    }

    if (!branch) {
      setText(DOM.errSetupBranch, "Please select branch.");
      hasError = true;
    }

    if (!scheme) {
      setText(DOM.errSetupScheme, "Please select scheme.");
      hasError = true;
    }

    if (!college) {
      setText(DOM.errSetupCollege, "Please enter college name.");
      hasError = true;
    }

    if (!academicYear) {
      setText(DOM.errSetupAcademicYear, "Please select academic year.");
      hasError = true;
    }

    if (!currentYear) {
      setText(DOM.errSetupCurrentYear, "Please select current year.");
      hasError = true;
    }

    if (hasError) return;

    const btnText = DOM.btnSaveProfile?.querySelector(".btn-text");
    const spinner = DOM.btnSaveProfile?.querySelector(".btn-spinner");

    setText(btnText, "Saving Profile...");
    if (spinner) spinner.classList.remove("hidden");
    if (DOM.btnSaveProfile) DOM.btnSaveProfile.disabled = true;

    const user = state.currentUser;
    const profilePayload = {
      name,
      pin: pinValidation.sanitized,
      branch,
      scheme,
      college,
      academicYear,
      currentYear,
      email: user.email || "",
      photoURL: user.photoURL || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, "students", user.uid), profilePayload);
      state.studentProfile = profilePayload;
      showToast("Profile created successfully!", "success");
      populateDashboardUI(profilePayload, user);
      setScreen("dashboard");
      switchTab("tab-overview");
    } catch (error) {
      console.error("Profile Save Error:", error);
      showToast(`Error saving profile: ${error.message}`, "error");
    } finally {
      setText(btnText, "Save & Continue to Dashboard");
      if (spinner) spinner.classList.add("hidden");
      if (DOM.btnSaveProfile) DOM.btnSaveProfile.disabled = false;
    }
  });
}

/* ==========================================================================
   Dashboard Hydration
   ========================================================================== */

function populateDashboardUI(profile, user) {
  if (!profile) return;

  const fallbackAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
  const avatar = user?.photoURL || profile?.photoURL || fallbackAvatar;
  const firstName = profile?.name?.split(" ")?.[0] || "Student";

  setText(DOM.dashGreeting, `Welcome back, ${firstName} 👋`);
  setSrc(DOM.dashUserAvatar, avatar);
  setText(DOM.dashPillName, profile.name);
  setText(DOM.dashPillPin, `PIN: ${profile.pin}`);

  setSrc(DOM.dashIdAvatar, avatar);
  setText(DOM.dashCardName, profile.name);
  setText(DOM.dashCardPin, `PIN: ${profile.pin}`);
  setText(DOM.dashCardCollege, profile.college);
  setText(DOM.dashCardScheme, `Scheme: ${profile.scheme}`);
  setText(DOM.dashCardBranch, profile.branch);
  setText(DOM.dashCardYear, profile.currentYear);
  setText(DOM.dashCardAcYear, profile.academicYear);

  setSrc(DOM.editAvatarPreview, avatar);
  setText(DOM.editAvatarName, profile.name);
  setText(DOM.editAvatarEmail, profile.email || user?.email || "");
  setValue(DOM.editName, profile.name);
  setValue(DOM.editPin, profile.pin);
  setValue(DOM.editBranch, profile.branch);
  setValue(DOM.editScheme, profile.scheme);
  setValue(DOM.editCollege, profile.college);
  setValue(DOM.editAcademicYear, profile.academicYear);
  setValue(DOM.editCurrentYear, profile.currentYear);
}

/* ==========================================================================
   Navigation Router (Direct SBTET Connect Open for Results & Attendance)
   ========================================================================== */

function switchTab(tabId) {
  // If Results or Attendance is clicked, open sbtetconnect.app immediately
  if (tabId === "tab-results" || tabId === "results") {
    openSBTETConnect("results");
    return;
  }

  if (tabId === "tab-attendance" || tabId === "attendance") {
    openSBTETConnect("attendance");
    return;
  }

  // Handle local tabs: Home (tab-overview), SBTET Info (tab-sbtet-info), Profile (tab-profile)
  state.activeTab = tabId;

  document.querySelectorAll(".portal-tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".mobile-bottom-nav .bottom-nav-item").forEach(btn => btn.classList.remove("active"));

  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add("active");

  const sidebarBtn = document.querySelector(`.sidebar-nav .nav-item[data-tab="${tabId}"]`);
  if (sidebarBtn) sidebarBtn.classList.add("active");

  const bottomBtn = document.querySelector(`.mobile-bottom-nav .bottom-nav-item[data-tab="${tabId}"]`);
  if (bottomBtn) bottomBtn.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Global click delegation for dashboard cards
document.addEventListener("click", (e) => {
  const card = e.target.closest(".dash-card[data-open-tab]");
  if (card) {
    switchTab(card.dataset.openTab);
  }
});

// Sidebar click listeners
document.querySelectorAll(".sidebar-nav .nav-item").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Mobile bottom navigation click listeners
document.querySelectorAll(".mobile-bottom-nav .bottom-nav-item").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Header avatar pill opens student profile
const headerProfileButton = document.getElementById("btn-header-profile");
addClickListener(headerProfileButton, () => switchTab("tab-profile"));

/* ==========================================================================
   Profile Edit Form Handler
   ========================================================================== */

if (DOM.formProfileEdit) {
  DOM.formProfileEdit.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = DOM.editName?.value.trim() || "";
    const rawPin = DOM.editPin?.value.trim() || "";
    const branch = DOM.editBranch?.value || "";
    const scheme = DOM.editScheme?.value || "";
    const college = DOM.editCollege?.value.trim() || "";
    const academicYear = DOM.editAcademicYear?.value || "";
    const currentYear = DOM.editCurrentYear?.value || "";

    const pinValidation = validatePIN(rawPin);
    if (!pinValidation.valid) {
      showToast(pinValidation.message, "error");
      return;
    }

    if (!name || !college) {
      showToast("All fields are required.", "error");
      return;
    }

    const btnText = DOM.btnUpdateProfile?.querySelector(".btn-text");
    const spinner = DOM.btnUpdateProfile?.querySelector(".btn-spinner");

    setText(btnText, "Updating...");
    if (spinner) spinner.classList.remove("hidden");
    if (DOM.btnUpdateProfile) DOM.btnUpdateProfile.disabled = true;

    try {
      const user = state.currentUser;
      const updatedData = {
        name,
        pin: pinValidation.sanitized,
        branch,
        scheme,
        college,
        academicYear,
        currentYear,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, "students", user.uid), updatedData);
      state.studentProfile = { ...state.studentProfile, ...updatedData };
      populateDashboardUI(state.studentProfile, user);
      showToast("Profile updated successfully!", "success");
    } catch (error) {
      console.error("Profile Update Error:", error);
      showToast("Failed to update profile.", "error");
    } finally {
      setText(btnText, "Save Changes");
      if (spinner) spinner.classList.add("hidden");
      if (DOM.btnUpdateProfile) DOM.btnUpdateProfile.disabled = false;
    }
  });
}
