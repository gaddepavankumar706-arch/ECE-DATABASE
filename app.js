/**
 * SBTET Student Connect - Core Controller & SPA Router
 */
import { auth, db, googleProvider, isConfigPlaceholder } from "./firebase-config.js";
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
import { sbtetService } from "./sbtetService.js";

/* --------------------------------------------------------------------------
   State Management
   -------------------------------------------------------------------------- */
const state = {
  currentUser: null,
  studentProfile: null,
  activeTab: "tab-overview"
};

/* --------------------------------------------------------------------------
   DOM Elements Cache
   -------------------------------------------------------------------------- */
const DOM = {
  // Screens
  loader: document.getElementById("screen-loader"),
  loaderText: document.getElementById("loader-status-text"),
  toastContainer: document.getElementById("toast-container"),
  viewAuth: document.getElementById("view-auth"),
  viewSetup: document.getElementById("view-setup"),
  viewDashboard: document.getElementById("view-dashboard"),
  
  // Auth Controls
  btnGoogleLogin: document.getElementById("btn-google-login"),
  
  // Setup View Controls
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

  // Dashboard Overview Card
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

  // Service View Containers
  resultsContainer: document.getElementById("results-container"),
  marksContainer: document.getElementById("marks-container"),
  attendanceContainer: document.getElementById("attendance-container"),
  examsContainer: document.getElementById("exams-container"),
  timetableContainer: document.getElementById("timetable-container"),
  notificationsContainer: document.getElementById("notifications-container"),

  // Profile Edit Controls
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

/* --------------------------------------------------------------------------
   UI Helpers: Toast & Notifications
   -------------------------------------------------------------------------- */
export function showToast(message, type = "info", duration = 3800) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let iconClass = "fa-circle-info";
  if (type === "success") iconClass = "fa-circle-check";
  if (type === "error") iconClass = "fa-circle-exclamation";
  if (type === "warning") iconClass = "fa-triangle-exclamation";

  toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${escapeHTML(message)}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.25s ease";
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

function escapeHTML(str) {
  if (!str) return "";
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
  DOM.viewAuth.classList.remove("active");
  DOM.viewSetup.classList.remove("active");
  DOM.viewDashboard.classList.remove("active");

  if (screenName === "auth") DOM.viewAuth.classList.add("active");
  if (screenName === "setup") DOM.viewSetup.classList.add("active");
  if (screenName === "dashboard") DOM.viewDashboard.classList.add("active");
}

function hideLoader() {
  DOM.loader.classList.add("fade-out");
}

function showLoader(statusMessage = "Loading SBTET Connect...") {
  DOM.loaderText.textContent = statusMessage;
  DOM.loader.classList.remove("fade-out");
}

/* --------------------------------------------------------------------------
   Validation Logic
   -------------------------------------------------------------------------- */
function validatePIN(pin) {
  const cleanPin = pin.trim().toUpperCase();
  // Standard Telangana SBTET PIN Regex (e.g., 21001-EC-001 or 24005M001 or 22014-C-021)
  const pinRegex = /^[0-9]{2}[0-9]{3,4}-?[A-Z]{1,3}-?[0-9]{3,4}$/;
  if (!cleanPin) {
    return { valid: false, message: "PIN is required." };
  }
  if (cleanPin.length < 9 || !pinRegex.test(cleanPin)) {
    return { valid: false, message: "Invalid SBTET PIN format (e.g. 21001-EC-001)." };
  }
  return { valid: true, sanitized: cleanPin };
}

/* --------------------------------------------------------------------------
   Authentication Orchestration
   -------------------------------------------------------------------------- */
DOM.btnGoogleLogin.addEventListener("click", async () => {
  if (isConfigPlaceholder) {
    showToast("Please enter your actual Firebase config in firebase-config.js", "error", 6000);
    return;
  }

  try {
    showLoader("Connecting to Google Account...");
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    hideLoader();
    if (error.code === "auth/popup-closed-by-user") {
      showToast("Sign in popup was closed before completion.", "warning");
    } else if (error.code === "auth/cancelled-popup-request") {
      // Ignore rapid consecutive clicks
    } else if (error.code === "auth/unauthorized-domain") {
      showToast("This domain is not authorized in Firebase Console -> Auth Settings.", "error", 6000);
    } else {
      console.error("Google Sign-In Error:", error);
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
    showToast("You have been safely signed out.", "info");
  } catch (error) {
    console.error("Sign Out Error:", error);
    showToast("Failed to sign out. Please try again.", "error");
  } finally {
    hideLoader();
  }
}

DOM.btnProfileLogout.addEventListener("click", handleSignOut);
DOM.btnSidebarLogout.addEventListener("click", handleSignOut);

/* --------------------------------------------------------------------------
   Auth State Listener (Single Source of Truth)
   -------------------------------------------------------------------------- */
onAuthStateChanged(auth, async (user) => {
  if (isConfigPlaceholder) {
    hideLoader();
    setScreen("auth");
    showToast("Setup required: Paste your Firebase config into firebase-config.js", "warning", 8000);
    return;
  }

  if (user) {
    state.currentUser = user;
    showLoader("Verifying student profile in Firestore...");

    try {
      const studentDocRef = doc(db, "students", user.uid);
      const studentSnapshot = await getDoc(studentDocRef);

      if (studentSnapshot.exists()) {
        state.studentProfile = studentSnapshot.data();
        populateDashboardUI(state.studentProfile, user);
        setScreen("dashboard");
        loadAcademicTab("tab-overview");
      } else {
        // First-time student: Prompt profile registration form
        prepareProfileSetupForm(user);
        setScreen("setup");
      }
    } catch (firestoreError) {
      console.error("Firestore Verification Error:", firestoreError);
      showToast("Error retrieving student profile. Verify Firestore rules.", "error");
      setScreen("auth");
    } finally {
      hideLoader();
    }
  } else {
    state.currentUser = null;
    state.studentProfile = null;
    hideLoader();
    setScreen("auth");
  }
});

/* --------------------------------------------------------------------------
   Profile Setup (New Student Registration)
   -------------------------------------------------------------------------- */
function prepareProfileSetupForm(user) {
  DOM.setupAvatar.src = user.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";
  DOM.setupEmail.textContent = user.email || "No Email Provided";
  DOM.setupName.value = user.displayName || "";
}

DOM.formSetup.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Clear previous errors
  DOM.errSetupName.textContent = "";
  DOM.errSetupPin.textContent = "";
  DOM.errSetupBranch.textContent = "";
  DOM.errSetupScheme.textContent = "";
  DOM.errSetupCollege.textContent = "";
  DOM.errSetupAcademicYear.textContent = "";
  DOM.errSetupCurrentYear.textContent = "";

  const name = DOM.setupName.value.trim();
  const rawPin = DOM.setupPin.value.trim();
  const branch = DOM.setupBranch.value;
  const scheme = DOM.setupScheme.value;
  const college = DOM.setupCollege.value.trim();
  const academicYear = DOM.setupAcademicYear.value;
  const currentYear = DOM.setupCurrentYear.value;

  let hasError = false;

  if (!name) {
    DOM.errSetupName.textContent = "Please enter your full name.";
    hasError = true;
  }

  const pinValidation = validatePIN(rawPin);
  if (!pinValidation.valid) {
    DOM.errSetupPin.textContent = pinValidation.message;
    hasError = true;
  }

  if (!branch) {
    DOM.errSetupBranch.textContent = "Please select your academic branch.";
    hasError = true;
  }

  if (!scheme) {
    DOM.errSetupScheme.textContent = "Please select your curriculum scheme.";
    hasError = true;
  }

  if (!college) {
    DOM.errSetupCollege.textContent = "Please enter your polytechnic college name.";
    hasError = true;
  }

  if (!academicYear) {
    DOM.errSetupAcademicYear.textContent = "Please choose academic year.";
    hasError = true;
  }

  if (!currentYear) {
    DOM.errSetupCurrentYear.textContent = "Please choose current year.";
    hasError = true;
  }

  if (hasError) return;

  const btnText = DOM.btnSaveProfile.querySelector(".btn-text");
  const spinner = DOM.btnSaveProfile.querySelector(".btn-spinner");
  
  btnText.textContent = "Saving Profile...";
  spinner.classList.remove("hidden");
  DOM.btnSaveProfile.disabled = true;

  try {
    const user = state.currentUser;
    const profilePayload = {
      name: name,
      pin: pinValidation.sanitized,
      branch: branch,
      scheme: scheme,
      college: college,
      academicYear: academicYear,
      currentYear: currentYear,
      email: user.email || "",
      photoURL: user.photoURL || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, "students", user.uid), profilePayload);
    state.studentProfile = profilePayload;
    
    showToast("Profile created successfully! Welcome to SBTET Connect.", "success");
    populateDashboardUI(profilePayload, user);
    setScreen("dashboard");
    loadAcademicTab("tab-overview");
  } catch (error) {
    console.error("Profile Save Error:", error);
    showToast(`Error saving profile: ${error.message}`, "error");
  } finally {
    btnText.textContent = "Save & Continue to Dashboard";
    spinner.classList.add("hidden");
    DOM.btnSaveProfile.disabled = false;
  }
});

/* --------------------------------------------------------------------------
   Dashboard Hydration & Render Engine
   -------------------------------------------------------------------------- */
function populateDashboardUI(profile, user) {
  const fallbackAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
  const avatar = user.photoURL || profile.photoURL || fallbackAvatar;

  // Header & Identity Card
  const firstName = profile.name.split(" ")[0];
  DOM.dashGreeting.textContent = `Welcome back, ${firstName} 👋`;
  DOM.dashUserAvatar.src = avatar;
  DOM.dashPillName.textContent = profile.name;
  DOM.dashPillPin.textContent = `PIN: ${profile.pin}`;

  DOM.dashIdAvatar.src = avatar;
  DOM.dashCardName.textContent = profile.name;
  DOM.dashCardPin.textContent = `PIN: ${profile.pin}`;
  DOM.dashCardCollege.textContent = profile.college;
  DOM.dashCardScheme.textContent = `Scheme: ${profile.scheme}`;
  DOM.dashCardBranch.textContent = profile.branch;
  DOM.dashCardYear.textContent = profile.currentYear;
  DOM.dashCardAcYear.textContent = profile.academicYear;

  // Profile Edit Tab Form
  DOM.editAvatarPreview.src = avatar;
  DOM.editAvatarName.textContent = profile.name;
  DOM.editAvatarEmail.textContent = profile.email || user.email;
  DOM.editName.value = profile.name;
  DOM.editPin.value = profile.pin;
  DOM.editBranch.value = profile.branch;
  DOM.editScheme.value = profile.scheme;
  DOM.editCollege.value = profile.college;
  DOM.editAcademicYear.value = profile.academicYear;
  DOM.editCurrentYear.value = profile.currentYear;
}

/* --------------------------------------------------------------------------
   Edit Profile Handler
   -------------------------------------------------------------------------- */
DOM.formProfileEdit.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = DOM.editName.value.trim();
  const rawPin = DOM.editPin.value.trim();
  const branch = DOM.editBranch.value;
  const scheme = DOM.editScheme.value;
  const college = DOM.editCollege.value.trim();
  const academicYear = DOM.editAcademicYear.value;
  const currentYear = DOM.editCurrentYear.value;

  const pinValidation = validatePIN(rawPin);
  if (!pinValidation.valid) {
    showToast(pinValidation.message, "error");
    return;
  }

  if (!name || !college) {
    showToast("All fields are required.", "error");
    return;
  }

  const btnText = DOM.btnUpdateProfile.querySelector(".btn-text");
  const spinner = DOM.btnUpdateProfile.querySelector(".btn-spinner");

  btnText.textContent = "Updating...";
  spinner.classList.remove("hidden");
  DOM.btnUpdateProfile.disabled = true;

  try {
    const user = state.currentUser;
    const updatedData = {
      name: name,
      pin: pinValidation.sanitized,
      branch: branch,
      scheme: scheme,
      college: college,
      academicYear: academicYear,
      currentYear: currentYear,
      updatedAt: serverTimestamp()
    };

    await updateDoc(doc(db, "students", user.uid), updatedData);
    state.studentProfile = { ...state.studentProfile, ...updatedData };
    populateDashboardUI(state.studentProfile, user);
    showToast("Profile updated successfully!", "success");
  } catch (error) {
    console.error("Profile Update Error:", error);
    showToast(`Update Failed: ${error.message}`, "error");
  } finally {
    btnText.textContent = "Save Changes";
    spinner.classList.add("hidden");
    DOM.btnUpdateProfile.disabled = false;
  }
});

/* --------------------------------------------------------------------------
   Navigation & Tab Routing System
   -------------------------------------------------------------------------- */
function switchTab(tabId) {
  state.activeTab = tabId;

  // Deactivate all tabs
  document.querySelectorAll(".portal-tab").forEach(tab => tab.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".bottom-nav-item").forEach(btn => btn.classList.remove("active"));

  // Activate selected tab content
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.classList.add("active");

  // Sync sidebar items
  const sidebarBtn = document.querySelector(`.sidebar-nav .nav-item[data-tab="${tabId}"]`);
  if (sidebarBtn) sidebarBtn.classList.add("active");

  // Sync bottom nav items
  const bottomBtn = document.querySelector(`.mobile-bottom-nav .bottom-nav-item[data-tab="${tabId}"]`);
  if (bottomBtn) bottomBtn.classList.add("active");

  // Scroll to top
  window.scrollTo({ top: 0, behavior: "smooth" });

  // Load async service data if needed
  loadAcademicTab(tabId);
}

// Sidebar click listeners
document.querySelectorAll(".sidebar-nav .nav-item").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Mobile bottom nav listeners
document.querySelectorAll(".mobile-bottom-nav .bottom-nav-item").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Overview Grid Cards click listeners
document.querySelectorAll(".dash-card[data-open-tab]").forEach(card => {
  card.addEventListener("click", () => switchTab(card.dataset.openTab));
});

// Header profile pill click listener
DOM.dashUserAvatar.parentElement.addEventListener("click", () => switchTab("tab-profile"));

/* --------------------------------------------------------------------------
   Async Academic Services Renderer
   -------------------------------------------------------------------------- */
async function loadAcademicTab(tabId) {
  const pin = state.studentProfile?.pin || "N/A";
  const scheme = state.studentProfile?.scheme || "C24";
  const branch = state.studentProfile?.branch || "ECE";

  switch (tabId) {
    case "tab-results":
      DOM.resultsContainer.innerHTML = createLoadingPlaceholder("Retrieving official semester results...");
      try {
        const data = await sbtetService.getStudentResults(pin);
        renderResults(data);
      } catch {
        renderError(DOM.resultsContainer, "Unable to load semester results.");
      }
      break;

    case "tab-marks":
      DOM.marksContainer.innerHTML = createLoadingPlaceholder("Calculating assessment marks...");
      try {
        const data = await sbtetService.getStudentMarks(pin);
        renderMarks(data);
      } catch {
        renderError(DOM.marksContainer, "Unable to load subject marks.");
      }
      break;

    case "tab-attendance":
      DOM.attendanceContainer.innerHTML = createLoadingPlaceholder("Syncing biometric attendance...");
      try {
        const data = await sbtetService.getAttendance(pin);
        renderAttendance(data);
      } catch {
        renderError(DOM.attendanceContainer, "Unable to load attendance records.");
      }
      break;

    case "tab-exams":
      DOM.examsContainer.innerHTML = createLoadingPlaceholder("Checking examination records...");
      try {
        const data = await sbtetService.getExamDetails(pin);
        renderExams(data);
      } catch {
        renderError(DOM.examsContainer, "Unable to load examination details.");
      }
      break;

    case "tab-timetable":
      DOM.timetableContainer.innerHTML = createLoadingPlaceholder("Fetching timetable schedule...");
      try {
        const data = await sbtetService.getTimeTable(scheme, branch);
        renderTimetable(data);
      } catch {
        renderError(DOM.timetableContainer, "Unable to load timetable.");
      }
      break;

    case "tab-notifications":
      DOM.notificationsContainer.innerHTML = createLoadingPlaceholder("Checking circulars...");
      try {
        const notifications = await sbtetService.getNotifications();
        renderNotifications(notifications);
      } catch {
        renderError(DOM.notificationsContainer, "Unable to load notifications.");
      }
      break;
  }
}

function createLoadingPlaceholder(message) {
  return `
    <div class="empty-state">
      <div class="spinner"></div>
      <p class="empty-desc">${escapeHTML(message)}</p>
    </div>
  `;
}

function renderError(container, message) {
  container.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-triangle-exclamation empty-icon" style="color: var(--danger)"></i>
      <h3 class="empty-title">Service Interruption</h3>
      <p class="empty-desc">${escapeHTML(message)}</p>
    </div>
  `;
}

/* --- Render Modules --- */

function renderResults(data) {
  if (!data.semesters || data.semesters.length === 0) {
    DOM.resultsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-file-excel empty-icon"></i>
        <h3 class="empty-title">No Results Published</h3>
        <p class="empty-desc">No academic semester results are currently associated with PIN ${escapeHTML(data.pin)}.</p>
      </div>`;
    return;
  }

  let html = `<div class="demo-data-badge"><i class="fa-solid fa-flask"></i> Demo Data - SBTET Official Integration Pending</div>`;
  
  data.semesters.forEach(sem => {
    html += `
      <div class="data-card">
        <div class="data-card-header">
          <div>
            <h3 class="data-card-title">${escapeHTML(sem.sem)}</h3>
            <span class="field-help">${escapeHTML(sem.examPeriod)}</span>
          </div>
          <span class="status-badge ${sem.status === 'PASSED' ? 'pass' : 'fail'}">${escapeHTML(sem.status)} (SGPA: ${escapeHTML(sem.gpa)})</span>
        </div>
        <div class="responsive-table-wrapper">
          <table class="sbtet-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Subject Name</th>
                <th>Internal</th>
                <th>External</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sem.subjects.map(s => `
                <tr>
                  <td><strong>${escapeHTML(s.code)}</strong></td>
                  <td>${escapeHTML(s.name)}</td>
                  <td>${escapeHTML(s.internal)}</td>
                  <td>${escapeHTML(s.external)}</td>
                  <td><strong>${escapeHTML(s.total)}</strong></td>
                  <td><span class="status-badge ${s.result === 'PASS' ? 'pass' : 'fail'}">${escapeHTML(s.result)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  });

  DOM.resultsContainer.innerHTML = html;
}

function renderMarks(data) {
  let html = `
    <div class="demo-data-badge"><i class="fa-solid fa-flask"></i> Demo Data - Periodic Internal Tests</div>
    <div class="data-card">
      <div class="data-card-header">
        <h3 class="data-card-title">Mid Assessment Marks (Current Semester)</h3>
      </div>
      <div class="responsive-table-wrapper">
        <table class="sbtet-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Slip Test 1</th>
              <th>Slip Test 2</th>
              <th>Assignment</th>
              <th>Mid Weighted Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.currentMidMarks.map(m => `
              <tr>
                <td>${escapeHTML(m.subject)}</td>
                <td>${escapeHTML(m.slipTest1)}</td>
                <td>${escapeHTML(m.slipTest2)}</td>
                <td>${escapeHTML(m.assignment)}</td>
                <td><strong>${escapeHTML(m.midTotal)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  DOM.marksContainer.innerHTML = html;
}

function renderAttendance(data) {
  let html = `
    <div class="demo-data-badge"><i class="fa-solid fa-flask"></i> Demo Data - SBTET Bio-metric Records</div>
    <div class="data-card">
      <div class="data-card-header">
        <div>
          <h3 class="data-card-title">Aggregate Semester Attendance</h3>
          <span class="field-help">Target mandatory attendance: 75.0%</span>
        </div>
        <span class="status-badge ${data.aggregatePercentage >= 75 ? 'pass' : 'fail'}">
          ${data.aggregatePercentage}%
        </span>
      </div>
      <div class="id-meta-grid" style="color: var(--text-main); margin-bottom: 14px;">
        <div><span>Total College Days:</span> <strong>${escapeHTML(data.totalWorkingDays)}</strong></div>
        <div><span>Days Present:</span> <strong>${escapeHTML(data.attendedDays)}</strong></div>
      </div>
      <div class="responsive-table-wrapper">
        <table class="sbtet-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Total Periods</th>
              <th>Attended Periods</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${data.months.map(m => `
              <tr>
                <td><strong>${escapeHTML(m.month)}</strong></td>
                <td>${escapeHTML(m.totalPeriods)}</td>
                <td>${escapeHTML(m.attendedPeriods)}</td>
                <td><strong>${escapeHTML(m.percentage)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  DOM.attendanceContainer.innerHTML = html;
}

function renderExams(data) {
  let html = `<div class="demo-data-badge"><i class="fa-solid fa-flask"></i> Demo Data - Examination Records</div>`;
  data.upcomingExams.forEach(e => {
    html += `
      <div class="data-card">
        <div class="data-card-header">
          <div>
            <h3 class="data-card-title">${escapeHTML(e.sessionName)}</h3>
            <span class="field-help">${escapeHTML(e.monthYear)}</span>
          </div>
          <span class="status-badge pass">${escapeHTML(e.feeStatus)}</span>
        </div>
        <div class="form-group">
          <label>Allocated Exam Center:</label>
          <p style="font-size: 0.9rem; font-weight: 600;">${escapeHTML(e.examCenter)}</p>
        </div>
        <div class="form-group" style="margin-top: 10px;">
          <label>Hall Ticket Number:</label>
          <p style="font-family: monospace; font-size: 1rem; color: var(--primary); font-weight: 700;">${escapeHTML(e.hallTicketId)}</p>
        </div>
      </div>
    `;
  });
  DOM.examsContainer.innerHTML = html;
}

function renderTimetable(data) {
  let html = `
    <div class="demo-data-badge"><i class="fa-solid fa-flask"></i> Demo Data - Scheme: ${escapeHTML(data.scheme)} | Branch: ${escapeHTML(data.branch)}</div>
    <div class="data-card">
      <div class="data-card-header">
        <h3 class="data-card-title">Theory Examination Schedule</h3>
      </div>
      <div class="responsive-table-wrapper">
        <table class="sbtet-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Timing</th>
              <th>Subject Code</th>
              <th>Subject Name</th>
            </tr>
          </thead>
          <tbody>
            ${data.schedule.map(s => `
              <tr>
                <td><strong>${escapeHTML(s.date)}</strong></td>
                <td>${escapeHTML(s.time)}</td>
                <td><span class="id-badge-scheme" style="background: var(--bg-app); color: var(--primary);">${escapeHTML(s.code)}</span></td>
                <td>${escapeHTML(s.subject)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
  DOM.timetableContainer.innerHTML = html;
}

function renderNotifications(items) {
  let html = "";
  items.forEach(n => {
    html += `
      <div class="data-card">
        <div class="data-card-header">
          <h3 class="data-card-title" style="font-size: 0.95rem;">
            ${n.isUrgent ? '<span class="status-badge fail" style="margin-right: 6px;">Important</span>' : ''}
            ${escapeHTML(n.title)}
          </h3>
          <span class="field-help">${escapeHTML(n.date)}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHTML(n.desc)}</p>
      </div>
    `;
  });
  DOM.notificationsContainer.innerHTML = html;
}

// Fallback: Force-hide loader after 5 seconds if auth state stalls
setTimeout(() => {
  const loader = document.getElementById("screen-loader");
  if (loader && !loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    // If no view is active, ensure the auth view is shown
    const hasActive = document.querySelector(".app-screen.active");
    if (!hasActive) {
      document.getElementById("view-auth").classList.add("active");
    }
  }
}, 5000);
