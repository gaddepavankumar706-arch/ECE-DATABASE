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

import { sbtetService } from "./sbtetService.js";


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

  // Service Containers
  resultsContainer: document.getElementById("results-container"),
  marksContainer: document.getElementById("marks-container"),
  attendanceContainer: document.getElementById("attendance-container"),
  examsContainer: document.getElementById("exams-container"),
  timetableContainer: document.getElementById("timetable-container"),
  notificationsContainer: document.getElementById("notifications-container"),

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
  if (element) {
    element.textContent = value ?? "";
  }
}

function setSrc(element, value, elementName = "unknown-element") {
  if (element) {
    element.src = value || "";
  } else {
    console.error(`Missing DOM element: ${elementName}`);
  }
}

function setValue(element, value) {
  if (element) {
    element.value = value ?? "";
  }
}

function addClickListener(element, callback, elementName = "unknown-element") {
  if (element) {
    element.addEventListener("click", callback);
  } else {
    console.warn(`Missing clickable DOM element: ${elementName}`);
  }
}


/* ==========================================================================
   UI Helpers
   ========================================================================== */

export function showToast(message, type = "info", duration = 3800) {
  if (!DOM.toastContainer) {
    console.error("Toast container is missing:", message);
    return;
  }

  const toast = document.createElement("div");

  toast.className = `toast ${type}`;

  let iconClass = "fa-circle-info";

  if (type === "success") {
    iconClass = "fa-circle-check";
  }

  if (type === "error") {
    iconClass = "fa-circle-exclamation";
  }

  if (type === "warning") {
    iconClass = "fa-triangle-exclamation";
  }

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${escapeHTML(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-10px)";
    toast.style.transition = "all 0.25s ease";

    setTimeout(() => {
      toast.remove();
    }, 250);

  }, duration);
}


function escapeHTML(str) {
  if (str === null || str === undefined) {
    return "";
  }

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


/* ==========================================================================
   Screen Management
   ========================================================================== */

function setScreen(screenName) {
  if (DOM.viewAuth) {
    DOM.viewAuth.classList.remove("active");
  }

  if (DOM.viewSetup) {
    DOM.viewSetup.classList.remove("active");
  }

  if (DOM.viewDashboard) {
    DOM.viewDashboard.classList.remove("active");
  }

  if (screenName === "auth" && DOM.viewAuth) {
    DOM.viewAuth.classList.add("active");
  }

  if (screenName === "setup" && DOM.viewSetup) {
    DOM.viewSetup.classList.add("active");
  }

  if (screenName === "dashboard" && DOM.viewDashboard) {
    DOM.viewDashboard.classList.add("active");
  }
}


function hideLoader() {
  if (DOM.loader) {
    DOM.loader.classList.add("fade-out");
  }
}


function showLoader(statusMessage = "Loading SBTET Connect...") {
  if (DOM.loaderText) {
    DOM.loaderText.textContent = statusMessage;
  }

  if (DOM.loader) {
    DOM.loader.classList.remove("fade-out");
  }
}


/* ==========================================================================
   Validation
   ========================================================================== */

function validatePIN(pin) {
  const cleanPin = String(pin || "").trim().toUpperCase();

  /*
   * Standard Telangana SBTET PIN examples:
   * 21001-EC-001
   * 24005M001
   * 22014-C-021
   */

  const pinRegex =
    /^[0-9]{2}[0-9]{3,4}-?[A-Z]{1,3}-?[0-9]{3,4}$/;

  if (!cleanPin) {
    return {
      valid: false,
      message: "PIN is required."
    };
  }

  if (cleanPin.length < 9 || !pinRegex.test(cleanPin)) {
    return {
      valid: false,
      message:
        "Invalid SBTET PIN format (e.g. 21001-EC-001)."
    };
  }

  return {
    valid: true,
    sanitized: cleanPin
  };
}


/* ==========================================================================
   Google Authentication
   ========================================================================== */

addClickListener(
  DOM.btnGoogleLogin,
  async () => {

    if (isConfigPlaceholder) {
      showToast(
        "Please enter your actual Firebase config in firebase-config.js",
        "error",
        6000
      );

      return;
    }

    try {
      showLoader("Connecting to Google Account...");

      await signInWithPopup(
        auth,
        googleProvider
      );

    } catch (error) {

      console.error("Google Sign-In Error:", error);

      hideLoader();

      if (error.code === "auth/popup-closed-by-user") {

        showToast(
          "Sign in popup was closed before completion.",
          "warning"
        );

      } else if (
        error.code === "auth/cancelled-popup-request"
      ) {

        // Ignore rapid consecutive clicks.

      } else if (
        error.code === "auth/unauthorized-domain"
      ) {

        showToast(
          "This domain is not authorized in Firebase Console → Authentication → Settings.",
          "error",
          6000
        );

      } else {

        showToast(
          `Login Failed: ${error.message}`,
          "error"
        );
      }
    }
  },
  "btn-google-login"
);


/* ==========================================================================
   Sign Out
   ========================================================================== */

async function handleSignOut() {

  try {

    showLoader("Signing out...");

    await signOut(auth);

    state.currentUser = null;
    state.studentProfile = null;

    setScreen("auth");

    showToast(
      "You have been safely signed out.",
      "info"
    );

  } catch (error) {

    console.error("Sign Out Error:", error);

    showToast(
      "Failed to sign out. Please try again.",
      "error"
    );

  } finally {

    hideLoader();
  }
}


addClickListener(
  DOM.btnProfileLogout,
  handleSignOut,
  "btn-profile-logout"
);

addClickListener(
  DOM.btnSidebarLogout,
  handleSignOut,
  "btn-sidebar-logout"
);


/* ==========================================================================
   Authentication State Listener
   ========================================================================== */

onAuthStateChanged(auth, async (user) => {

  /*
   * Firebase configuration check
   */

  if (isConfigPlaceholder) {

    hideLoader();

    setScreen("auth");

    showToast(
      "Setup required: Paste your Firebase config into firebase-config.js",
      "warning",
      8000
    );

    return;
  }


  /*
   * No authenticated user
   */

  if (!user) {

    state.currentUser = null;
    state.studentProfile = null;

    hideLoader();

    setScreen("auth");

    return;
  }


  /*
   * Authenticated user
   */

  state.currentUser = user;

  showLoader(
    "Verifying student profile in Firestore..."
  );


  try {

    console.log(
      "Firebase Auth user:",
      user.uid
    );

    const studentDocRef =
      doc(db, "students", user.uid);

    console.log(
      "Reading Firestore document:",
      `students/${user.uid}`
    );


    /*
     * Add a timeout so the loading screen
     * can never stay forever.
     */

    const firestoreTimeout = new Promise(
      (_, reject) => {

        setTimeout(() => {

          reject(
            new Error(
              "Firestore request timed out after 10 seconds. Check your Firestore database, rules, and internet connection."
            )
          );

        }, 10000);

      }
    );


    const studentSnapshot =
      await Promise.race([
        getDoc(studentDocRef),
        firestoreTimeout
      ]);


    console.log(
      "Firestore response received."
    );

    console.log(
      "Student profile exists:",
      studentSnapshot.exists()
    );


    if (studentSnapshot.exists()) {

      /*
       * Existing student
       */

      state.studentProfile =
        studentSnapshot.data();


      /*
       * Dashboard rendering is intentionally
       * handled separately below.
       */

      try {

        populateDashboardUI(
          state.studentProfile,
          user
        );

        setScreen("dashboard");

        loadAcademicTab(
          "tab-overview"
        );

      } catch (uiError) {

        console.error(
          "Dashboard UI Error:",
          uiError
        );

        showToast(
          `Profile loaded, but dashboard UI could not be rendered: ${uiError.message}`,
          "error",
          8000
        );

        /*
         * Keep the user authenticated instead of
         * pretending the Firestore operation failed.
         */

        setScreen("dashboard");
      }

    } else {

      /*
       * First-time student
       */

      try {

        prepareProfileSetupForm(user);

        setScreen("setup");

      } catch (setupError) {

        console.error(
          "Profile Setup UI Error:",
          setupError
        );

        showToast(
          `Unable to open profile setup: ${setupError.message}`,
          "error",
          8000
        );

        setScreen("auth");
      }
    }


  } catch (firestoreError) {

    console.error(
      "Firestore Verification Error:",
      firestoreError
    );


    let message =
      firestoreError?.message ||
      "Unknown Firestore error.";


    /*
     * More useful Firestore error messages
     */

    if (
      firestoreError?.code ===
      "permission-denied"
    ) {

      message =
        "Firestore permission denied. Check your Firestore Security Rules.";

    } else if (
      firestoreError?.code ===
      "unavailable"
    ) {

      message =
        "Firestore is temporarily unavailable. Check your internet connection.";

    } else if (
      firestoreError?.code ===
      "failed-precondition"
    ) {

      message =
        "Firestore database configuration is incomplete.";

    }


    showToast(
      `Unable to retrieve student profile: ${message}`,
      "error",
      10000
    );


    setScreen("auth");


  } finally {

    hideLoader();

  }

});


/* ==========================================================================
   Profile Setup
   ========================================================================== */

function prepareProfileSetupForm(user) {

  const fallbackAvatar =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80";


  setSrc(
    DOM.setupAvatar,
    user?.photoURL || fallbackAvatar,
    "setup-avatar"
  );


  setText(
    DOM.setupEmail,
    user?.email || "No Email Provided"
  );


  setValue(
    DOM.setupName,
    user?.displayName || ""
  );
}


/* ==========================================================================
   Create Student Profile
   ========================================================================== */

if (DOM.formSetup) {

  DOM.formSetup.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();


      /*
       * Clear previous errors
       */

      setText(DOM.errSetupName, "");
      setText(DOM.errSetupPin, "");
      setText(DOM.errSetupBranch, "");
      setText(DOM.errSetupScheme, "");
      setText(DOM.errSetupCollege, "");
      setText(DOM.errSetupAcademicYear, "");
      setText(DOM.errSetupCurrentYear, "");


      /*
       * Read form values
       */

      const name =
        DOM.setupName?.value.trim() || "";

      const rawPin =
        DOM.setupPin?.value.trim() || "";

      const branch =
        DOM.setupBranch?.value || "";

      const scheme =
        DOM.setupScheme?.value || "";

      const college =
        DOM.setupCollege?.value.trim() || "";

      const academicYear =
        DOM.setupAcademicYear?.value || "";

      const currentYear =
        DOM.setupCurrentYear?.value || "";


      let hasError = false;


      /*
       * Name
       */

      if (!name) {

        setText(
          DOM.errSetupName,
          "Please enter your full name."
        );

        hasError = true;
      }


      /*
       * PIN
       */

      const pinValidation =
        validatePIN(rawPin);


      if (!pinValidation.valid) {

        setText(
          DOM.errSetupPin,
          pinValidation.message
        );

        hasError = true;
      }


      /*
       * Branch
       */

      if (!branch) {

        setText(
          DOM.errSetupBranch,
          "Please select your academic branch."
        );

        hasError = true;
      }


      /*
       * Scheme
       */

      if (!scheme) {

        setText(
          DOM.errSetupScheme,
          "Please select your curriculum scheme."
        );

        hasError = true;
      }


      /*
       * College
       */

      if (!college) {

        setText(
          DOM.errSetupCollege,
          "Please enter your polytechnic college name."
        );

        hasError = true;
      }


      /*
       * Academic year
       */

      if (!academicYear) {

        setText(
          DOM.errSetupAcademicYear,
          "Please choose academic year."
        );

        hasError = true;
      }


      /*
       * Current year
       */

      if (!currentYear) {

        setText(
          DOM.errSetupCurrentYear,
          "Please choose current year."
        );

        hasError = true;
      }


      if (hasError) {
        return;
      }


      /*
       * Button loading state
       */

      const btnText =
        DOM.btnSaveProfile?.querySelector(
          ".btn-text"
        );

      const spinner =
        DOM.btnSaveProfile?.querySelector(
          ".btn-spinner"
        );


      setText(
        btnText,
        "Saving Profile..."
      );


      if (spinner) {
        spinner.classList.remove("hidden");
      }


      if (DOM.btnSaveProfile) {
        DOM.btnSaveProfile.disabled = true;
      }


      /*
       * Ensure user exists
       */

      const user =
        state.currentUser;


      if (!user) {

        showToast(
          "Authentication session expired. Please sign in again.",
          "error"
        );

        if (DOM.btnSaveProfile) {
          DOM.btnSaveProfile.disabled = false;
        }

        if (spinner) {
          spinner.classList.add("hidden");
        }

        setText(
          btnText,
          "Save & Continue to Dashboard"
        );

        return;
      }


      /*
       * Prepare Firestore profile
       */

      const profilePayload = {

        name: name,

        pin:
          pinValidation.sanitized,

        branch: branch,

        scheme: scheme,

        college: college,

        academicYear:
          academicYear,

        currentYear:
          currentYear,

        email:
          user.email || "",

        photoURL:
          user.photoURL || "",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp()
      };


      /* =====================================================================
         IMPORTANT:
         Firestore SAVE is separated from UI rendering.
         ===================================================================== */

      try {

        console.log(
          "Saving student profile to Firestore..."
        );


        await setDoc(
          doc(
            db,
            "students",
            user.uid
          ),
          profilePayload
        );


        /*
         * Firestore save succeeded.
         */

        console.log(
          "Student profile saved successfully."
        );


        state.studentProfile =
          profilePayload;


        showToast(
          "Profile created successfully! Welcome to SBTET Connect.",
          "success"
        );


      } catch (error) {

        /*
         * ONLY Firestore errors arrive here.
         */

        console.error(
          "Profile Save Error:",
          error
        );


        let message =
          error?.message ||
          "Unable to save profile.";


        if (
          error?.code ===
          "permission-denied"
        ) {

          message =
            "Firestore permission denied. Check your Firestore Security Rules.";

        }


        showToast(
          `Error saving profile: ${message}`,
          "error",
          8000
        );


        return;
      }


      /* =====================================================================
         Dashboard Rendering
         ===================================================================== */

      try {

        populateDashboardUI(
          profilePayload,
          user
        );


        setScreen(
          "dashboard"
        );


        loadAcademicTab(
          "tab-overview"
        );


      } catch (uiError) {

        /*
         * This is NOT a Firestore error.
         * The profile has already been saved.
         */

        console.error(
          "Dashboard UI Error after profile save:",
          uiError
        );


        showToast(
          `Profile saved, but dashboard could not load: ${uiError.message}`,
          "error",
          10000
        );


        /*
         * Still show dashboard.
         */

        setScreen(
          "dashboard"
        );
      }


      /*
       * Restore button
       */

      setText(
        btnText,
        "Save & Continue to Dashboard"
      );


      if (spinner) {
        spinner.classList.add("hidden");
      }


      if (DOM.btnSaveProfile) {
        DOM.btnSaveProfile.disabled = false;
      }

    }
  );

}


/* ==========================================================================
   Dashboard Hydration & Render Engine
   ========================================================================== */

function populateDashboardUI(profile, user) {

  if (!profile) {

    throw new Error(
      "Student profile data is missing."
    );
  }


  const fallbackAvatar =
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";


  const avatar =
    user?.photoURL ||
    profile?.photoURL ||
    fallbackAvatar;


  const firstName =
    profile?.name?.split(" ")?.[0] ||
    "Student";


  /*
   * Header
   */

  setText(
    DOM.dashGreeting,
    `Welcome back, ${firstName} 👋`
  );


  setSrc(
    DOM.dashUserAvatar,
    avatar,
    "dash-user-avatar"
  );


  setText(
    DOM.dashPillName,
    profile.name
  );


  setText(
    DOM.dashPillPin,
    `PIN: ${profile.pin}`
  );


  /*
   * Student ID Card
   */

  setSrc(
    DOM.dashIdAvatar,
    avatar,
    "dash-id-avatar"
  );


  setText(
    DOM.dashCardName,
    profile.name
  );


  setText(
    DOM.dashCardPin,
    `PIN: ${profile.pin}`
  );


  setText(
    DOM.dashCardCollege,
    profile.college
  );


  setText(
    DOM.dashCardScheme,
    `Scheme: ${profile.scheme}`
  );


  setText(
    DOM.dashCardBranch,
    profile.branch
  );


  setText(
    DOM.dashCardYear,
    profile.currentYear
  );


  setText(
    DOM.dashCardAcYear,
    profile.academicYear
  );


  /*
   * Profile Edit Tab
   */

  setSrc(
    DOM.editAvatarPreview,
    avatar,
    "edit-avatar-preview"
  );


  setText(
    DOM.editAvatarName,
    profile.name
  );


  setText(
    DOM.editAvatarEmail,
    profile.email ||
    user?.email ||
    ""
  );


  setValue(
    DOM.editName,
    profile.name
  );


  setValue(
    DOM.editPin,
    profile.pin
  );


  setValue(
    DOM.editBranch,
    profile.branch
  );


  setValue(
    DOM.editScheme,
    profile.scheme
  );


  setValue(
    DOM.editCollege,
    profile.college
  );


  setValue(
    DOM.editAcademicYear,
    profile.academicYear
  );


  setValue(
    DOM.editCurrentYear,
    profile.currentYear
  );
}


/* ==========================================================================
   Edit Profile Handler
   ========================================================================== */

if (DOM.formProfileEdit) {

  DOM.formProfileEdit.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();


      const name =
        DOM.editName?.value.trim() || "";

      const rawPin =
        DOM.editPin?.value.trim() || "";

      const branch =
        DOM.editBranch?.value || "";

      const scheme =
        DOM.editScheme?.value || "";

      const college =
        DOM.editCollege?.value.trim() || "";

      const academicYear =
        DOM.editAcademicYear?.value || "";

      const currentYear =
        DOM.editCurrentYear?.value || "";


      const pinValidation =
        validatePIN(rawPin);


      if (!pinValidation.valid) {

        showToast(
          pinValidation.message,
          "error"
        );

        return;
      }


      if (!name || !college) {

        showToast(
          "All fields are required.",
          "error"
        );

        return;
      }


      if (!state.currentUser) {

        showToast(
          "Authentication session expired. Please sign in again.",
          "error"
        );

        return;
      }


      const btnText =
        DOM.btnUpdateProfile?.querySelector(
          ".btn-text"
        );

      const spinner =
        DOM.btnUpdateProfile?.querySelector(
          ".btn-spinner"
        );


      setText(
        btnText,
        "Updating..."
      );


      if (spinner) {
        spinner.classList.remove("hidden");
      }


      if (DOM.btnUpdateProfile) {
        DOM.btnUpdateProfile.disabled = true;
      }


      try {

        const user =
          state.currentUser;


        const updatedData = {

          name: name,

          pin:
            pinValidation.sanitized,

          branch: branch,

          scheme: scheme,

          college: college,

          academicYear:
            academicYear,

          currentYear:
            currentYear,

          updatedAt:
            serverTimestamp()
        };


        /*
         * Save changes to Firestore.
         */

        await updateDoc(
          doc(
            db,
            "students",
            user.uid
          ),
          updatedData
        );


        /*
         * Update local state.
         */

        state.studentProfile = {
          ...state.studentProfile,
          ...updatedData
        };


        /*
         * Refresh dashboard UI.
         */

        try {

          populateDashboardUI(
            state.studentProfile,
            user
          );

        } catch (uiError) {

          console.error(
            "Profile UI Update Error:",
            uiError
          );

          showToast(
            `Profile updated, but some UI elements could not refresh: ${uiError.message}`,
            "warning",
            8000
          );
        }


        showToast(
          "Profile updated successfully!",
          "success"
        );


      } catch (error) {

        console.error(
          "Profile Update Error:",
          error
        );


        let message =
          error?.message ||
          "Unable to update profile.";


        if (
          error?.code ===
          "permission-denied"
        ) {

          message =
            "Firestore permission denied. Check your Firestore Security Rules.";
        }


        showToast(
          `Update Failed: ${message}`,
          "error",
          8000
        );


      } finally {

        setText(
          btnText,
          "Save Changes"
        );


        if (spinner) {
          spinner.classList.add("hidden");
        }


        if (DOM.btnUpdateProfile) {
          DOM.btnUpdateProfile.disabled = false;
        }
      }

    }
  );

}


/* ==========================================================================
   Navigation & Tab Routing
   ========================================================================== */

function switchTab(tabId) {

  state.activeTab =
    tabId;


  /*
   * Deactivate all tabs
   */

  document
    .querySelectorAll(".portal-tab")
    .forEach(tab => {

      tab.classList.remove(
        "active"
      );

    });


  /*
   * Deactivate sidebar buttons
   */

  document
    .querySelectorAll(".nav-item")
    .forEach(btn => {

      btn.classList.remove(
        "active"
      );

    });


  /*
   * Deactivate bottom navigation
   */

  document
    .querySelectorAll(".bottom-nav-item")
    .forEach(btn => {

      btn.classList.remove(
        "active"
      );

    });


  /*
   * Activate selected tab
   */

  const targetTab =
    document.getElementById(
      tabId
    );


  if (targetTab) {

    targetTab.classList.add(
      "active"
    );

  } else {

    console.warn(
      `Tab element not found: ${tabId}`
    );
  }


  /*
   * Sidebar navigation
   */

  const sidebarBtn =
    document.querySelector(
      `.sidebar-nav .nav-item[data-tab="${tabId}"]`
    );


  if (sidebarBtn) {

    sidebarBtn.classList.add(
      "active"
    );
  }


  /*
   * Mobile navigation
   */

  const bottomBtn =
    document.querySelector(
      `.mobile-bottom-nav .bottom-nav-item[data-tab="${tabId}"]`
    );


  if (bottomBtn) {

    bottomBtn.classList.add(
      "active"
    );
  }


  /*
   * Scroll to top
   */

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  /*
   * Load service data
   */

  loadAcademicTab(
    tabId
  );
}


/* ==========================================================================
   Sidebar Navigation Listeners
   ========================================================================== */

document
  .querySelectorAll(
    ".sidebar-nav .nav-item"
  )
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        switchTab(
          btn.dataset.tab
        );

      }
    );

  });


/* ==========================================================================
   Mobile Bottom Navigation
   ========================================================================== */

document
  .querySelectorAll(
    ".mobile-bottom-nav .bottom-nav-item"
  )
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        switchTab(
          btn.dataset.tab
        );

      }
    );

  });


/* ==========================================================================
   Overview Grid Cards
   ========================================================================== */

document
  .querySelectorAll(
    ".dash-card[data-open-tab]"
  )
  .forEach(card => {

    card.addEventListener(
      "click",
      () => {

        switchTab(
          card.dataset.openTab
        );

      }
    );

  });


/* ==========================================================================
   Header Profile Pill
   ========================================================================== */

const headerProfileButton =
  document.getElementById(
    "btn-header-profile"
  );


addClickListener(
  headerProfileButton,
  () => {

    switchTab(
      "tab-profile"
    );

  },
  "btn-header-profile"
);


/* ==========================================================================
   Async Academic Services Renderer
   ========================================================================== */

async function loadAcademicTab(tabId) {

  const pin =
    state.studentProfile?.pin ||
    "N/A";


  const scheme =
    state.studentProfile?.scheme ||
    "C24";


  const branch =
    state.studentProfile?.branch ||
    "ECE";


  switch (tabId) {


    /* ----------------------------------------------------------------------
       RESULTS
       ---------------------------------------------------------------------- */

    case "tab-results":

      if (!DOM.resultsContainer) {
        console.warn(
          "results-container is missing."
        );
        break;
      }


      DOM.resultsContainer.innerHTML =
        createLoadingPlaceholder(
          "Retrieving official semester results..."
        );


      try {

        const data =
          await sbtetService.getStudentResults(
            pin
          );


        renderResults(
          data
        );


      } catch (error) {

        console.error(
          "Results Service Error:",
          error
        );


        renderError(
          DOM.resultsContainer,
          "Unable to load semester results."
        );

      }

      break;


    /* ----------------------------------------------------------------------
       MARKS
       ---------------------------------------------------------------------- */

    case "tab-marks":

      if (!DOM.marksContainer) {
        console.warn(
          "marks-container is missing."
        );
        break;
      }


      DOM.marksContainer.innerHTML =
        createLoadingPlaceholder(
          "Calculating assessment marks..."
        );


      try {

        const data =
          await sbtetService.getStudentMarks(
            pin
          );


        renderMarks(
          data
        );


      } catch (error) {

        console.error(
          "Marks Service Error:",
          error
        );


        renderError(
          DOM.marksContainer,
          "Unable to load subject marks."
        );

      }

      break;


    /* ----------------------------------------------------------------------
       ATTENDANCE
       ---------------------------------------------------------------------- */

    case "tab-attendance":

      if (!DOM.attendanceContainer) {
        console.warn(
          "attendance-container is missing."
        );
        break;
      }


      DOM.attendanceContainer.innerHTML =
        createLoadingPlaceholder(
          "Syncing biometric attendance..."
        );


      try {

        const data =
          await sbtetService.getAttendance(
            pin
          );


        renderAttendance(
          data
        );


      } catch (error) {

        console.error(
          "Attendance Service Error:",
          error
        );


        renderError(
          DOM.attendanceContainer,
          "Unable to load attendance records."
        );

      }

      break;


    /* ----------------------------------------------------------------------
       EXAMS
       ---------------------------------------------------------------------- */

    case "tab-exams":

      if (!DOM.examsContainer) {
        console.warn(
          "exams-container is missing."
        );
        break;
      }


      DOM.examsContainer.innerHTML =
        createLoadingPlaceholder(
          "Checking examination records..."
        );


      try {

        const data =
          await sbtetService.getExamDetails(
            pin
          );


        renderExams(
          data
        );


      } catch (error) {

        console.error(
          "Exam Service Error:",
          error
        );


        renderError(
          DOM.examsContainer,
          "Unable to load examination details."
        );

      }

      break;


    /* ----------------------------------------------------------------------
       TIMETABLE
       ---------------------------------------------------------------------- */

    case "tab-timetable":

      if (!DOM.timetableContainer) {
        console.warn(
          "timetable-container is missing."
        );
        break;
      }


      DOM.timetableContainer.innerHTML =
        createLoadingPlaceholder(
          "Fetching timetable schedule..."
        );


      try {

        const data =
          await sbtetService.getTimeTable(
            scheme,
            branch
          );


        renderTimetable(
          data
        );


      } catch (error) {

        console.error(
          "Timetable Service Error:",
          error
        );


        renderError(
          DOM.timetableContainer,
          "Unable to load timetable."
        );

      }

      break;


    /* ----------------------------------------------------------------------
       NOTIFICATIONS
       ---------------------------------------------------------------------- */

    case "tab-notifications":

      if (!DOM.notificationsContainer) {
        console.warn(
          "notifications-container is missing."
        );
        break;
      }


      DOM.notificationsContainer.innerHTML =
        createLoadingPlaceholder(
          "Checking circulars..."
        );


      try {

        const notifications =
          await sbtetService.getNotifications();


        renderNotifications(
          notifications
        );


      } catch (error) {

        console.error(
          "Notification Service Error:",
          error
        );


        renderError(
          DOM.notificationsContainer,
          "Unable to load notifications."
        );

      }

      break;


    /*
     * Overview and profile don't need
     * an academic service request.
     */

    case "tab-overview":
    case "tab-profile":
      break;


    default:

      console.warn(
        `Unknown academic tab: ${tabId}`
      );

      break;
  }
}


/* ==========================================================================
   Loading Placeholder
   ========================================================================== */

function createLoadingPlaceholder(message) {

  return `
    <div class="empty-state">

      <div class="spinner"></div>

      <p class="empty-desc">
        ${escapeHTML(message)}
      </p>

    </div>
  `;
}


/* ==========================================================================
   Error Renderer
   ========================================================================== */

function renderError(
  container,
  message
) {

  if (!container) {
    console.error(
      "Cannot render error. Container is missing:",
      message
    );

    return;
  }


  container.innerHTML = `
    <div class="empty-state">

      <i
        class="fa-solid fa-triangle-exclamation empty-icon"
        style="color: var(--danger)"
      ></i>

      <h3 class="empty-title">
        Service Interruption
      </h3>

      <p class="empty-desc">
        ${escapeHTML(message)}
      </p>

    </div>
  `;
}


/* ==========================================================================
   Results Renderer
   ========================================================================== */

function renderResults(data) {

  if (!DOM.resultsContainer) {
    return;
  }


  if (
    !data ||
    !data.semesters ||
    data.semesters.length === 0
  ) {

    DOM.resultsContainer.innerHTML = `

      <div class="empty-state">

        <i class="fa-solid fa-file-excel empty-icon"></i>

        <h3 class="empty-title">
          No Results Published
        </h3>

        <p class="empty-desc">
          No academic semester results are currently associated
          with PIN ${escapeHTML(data?.pin || "N/A")}.
        </p>

      </div>

    `;

    return;
  }


  let html = `

    <div class="demo-data-badge">

      <i class="fa-solid fa-flask"></i>

      Demo Data - SBTET Official Integration Pending

    </div>

  `;


  data.semesters.forEach(
    sem => {

      html += `

        <div class="data-card">

          <div class="data-card-header">

            <div>

              <h3 class="data-card-title">
                ${escapeHTML(sem.sem)}
              </h3>

              <span class="field-help">
                ${escapeHTML(sem.examPeriod)}
              </span>

            </div>

            <span class="status-badge ${
              sem.status === "PASSED"
                ? "pass"
                : "fail"
            }">

              ${escapeHTML(sem.status)}
              (SGPA: ${escapeHTML(sem.gpa)})

            </span>

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

                ${
                  Array.isArray(sem.subjects)
                    ? sem.subjects
                        .map(
                          s => `

                            <tr>

                              <td>
                                <strong>
                                  ${escapeHTML(s.code)}
                                </strong>
                              </td>

                              <td>
                                ${escapeHTML(s.name)}
                              </td>

                              <td>
                                ${escapeHTML(s.internal)}
                              </td>

                              <td>
                                ${escapeHTML(s.external)}
                              </td>

                              <td>
                                <strong>
                                  ${escapeHTML(s.total)}
                                </strong>
                              </td>

                              <td>

                                <span class="status-badge ${
                                  s.result === "PASS"
                                    ? "pass"
                                    : "fail"
                                }">

                                  ${escapeHTML(s.result)}

                                </span>

                              </td>

                            </tr>

                          `
                        )
                        .join("")
                    : ""
                }

              </tbody>

            </table>

          </div>

        </div>

      `;
    }
  );


  DOM.resultsContainer.innerHTML =
    html;
}


/* ==========================================================================
   Marks Renderer
   ========================================================================== */

function renderMarks(data) {

  if (!DOM.marksContainer) {
    return;
  }


  const marks =
    Array.isArray(data?.currentMidMarks)
      ? data.currentMidMarks
      : [];


  let html = `

    <div class="demo-data-badge">

      <i class="fa-solid fa-flask"></i>

      Demo Data - Periodic Internal Tests

    </div>


    <div class="data-card">

      <div class="data-card-header">

        <h3 class="data-card-title">
          Mid Assessment Marks (Current Semester)
        </h3>

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

            ${
              marks
                .map(
                  m => `

                    <tr>

                      <td>
                        ${escapeHTML(m.subject)}
                      </td>

                      <td>
                        ${escapeHTML(m.slipTest1)}
                      </td>

                      <td>
                        ${escapeHTML(m.slipTest2)}
                      </td>

                      <td>
                        ${escapeHTML(m.assignment)}
                      </td>

                      <td>

                        <strong>
                          ${escapeHTML(m.midTotal)}
                        </strong>

                      </td>

                    </tr>

                  `
                )
                .join("")
            }

          </tbody>

        </table>

      </div>

    </div>

  `;


  DOM.marksContainer.innerHTML =
    html;
}


/* ==========================================================================
   Attendance Renderer
   ========================================================================== */

function renderAttendance(data) {

  if (!DOM.attendanceContainer) {
    return;
  }


  const months =
    Array.isArray(data?.months)
      ? data.months
      : [];


  const aggregate =
    Number(data?.aggregatePercentage || 0);


  let html = `

    <div class="demo-data-badge">

      <i class="fa-solid fa-flask"></i>

      Demo Data - SBTET Bio-metric Records

    </div>


    <div class="data-card">

      <div class="data-card-header">

        <div>

          <h3 class="data-card-title">
            Aggregate Semester Attendance
          </h3>

          <span class="field-help">
            Target mandatory attendance: 75.0%
          </span>

        </div>


        <span class="status-badge ${
          aggregate >= 75
            ? "pass"
            : "fail"
        }">

          ${escapeHTML(data?.aggregatePercentage ?? "0")}%

        </span>

      </div>


      <div
        class="id-meta-grid"
        style="color: var(--text-main); margin-bottom: 14px;"
      >

        <div>

          <span>
            Total College Days:
          </span>

          <strong>
            ${escapeHTML(data?.totalWorkingDays ?? "0")}
          </strong>

        </div>


        <div>

          <span>
            Days Present:
          </span>

          <strong>
            ${escapeHTML(data?.attendedDays ?? "0")}
          </strong>

        </div>

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

            ${
              months
                .map(
                  m => `

                    <tr>

                      <td>

                        <strong>
                          ${escapeHTML(m.month)}
                        </strong>

                      </td>

                      <td>
                        ${escapeHTML(m.totalPeriods)}
                      </td>

                      <td>
                        ${escapeHTML(m.attendedPeriods)}
                      </td>

                      <td>

                        <strong>
                          ${escapeHTML(m.percentage)}
                        </strong>

                      </td>

                    </tr>

                  `
                )
                .join("")
            }

          </tbody>

        </table>

      </div>

    </div>

  `;


  DOM.attendanceContainer.innerHTML =
    html;
}


/* ==========================================================================
   Exams Renderer
   ========================================================================== */

function renderExams(data) {

  if (!DOM.examsContainer) {
    return;
  }


  const exams =
    Array.isArray(data?.upcomingExams)
      ? data.upcomingExams
      : [];


  let html = `

    <div class="demo-data-badge">

      <i class="fa-solid fa-flask"></i>

      Demo Data - Examination Records

    </div>

  `;


  exams.forEach(
    e => {

      html += `

        <div class="data-card">

          <div class="data-card-header">

            <div>

              <h3 class="data-card-title">
                ${escapeHTML(e.sessionName)}
              </h3>

              <span class="field-help">
                ${escapeHTML(e.monthYear)}
              </span>

            </div>


            <span class="status-badge pass">

              ${escapeHTML(e.feeStatus)}

            </span>

          </div>


          <div class="form-group">

            <label>
              Allocated Exam Center:
            </label>

            <p
              style="
                font-size: 0.9rem;
                font-weight: 600;
              "
            >

              ${escapeHTML(e.examCenter)}

            </p>

          </div>


          <div
            class="form-group"
            style="margin-top: 10px;"
          >

            <label>
              Hall Ticket Number:
            </label>

            <p
              style="
                font-family: monospace;
                font-size: 1rem;
                color: var(--primary);
                font-weight: 700;
              "
            >

              ${escapeHTML(e.hallTicketId)}

            </p>

          </div>

        </div>

      `;
    }
  );


  if (exams.length === 0) {

    html += `

      <div class="empty-state">

        <i class="fa-solid fa-calendar-xmark empty-icon"></i>

        <h3 class="empty-title">
          No Upcoming Exams
        </h3>

        <p class="empty-desc">
          No examination records are currently available.
        </p>

      </div>

    `;
  }


  DOM.examsContainer.innerHTML =
    html;
}


/* ==========================================================================
   Timetable Renderer
   ========================================================================== */

function renderTimetable(data) {

  if (!DOM.timetableContainer) {
    return;
  }


  const schedule =
    Array.isArray(data?.schedule)
      ? data.schedule
      : [];


  let html = `

    <div class="demo-data-badge">

      <i class="fa-solid fa-flask"></i>

      Demo Data - Scheme:
      ${escapeHTML(data?.scheme || "N/A")}
      |
      Branch:
      ${escapeHTML(data?.branch || "N/A")}

    </div>


    <div class="data-card">

      <div class="data-card-header">

        <h3 class="data-card-title">
          Theory Examination Schedule
        </h3>

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

            ${
              schedule
                .map(
                  s => `

                    <tr>

                      <td>

                        <strong>
                          ${escapeHTML(s.date)}
                        </strong>

                      </td>

                      <td>
                        ${escapeHTML(s.time)}
                      </td>

                      <td>

                        <span
                          class="id-badge-scheme"
                          style="
                            background: var(--bg-app);
                            color: var(--primary);
                          "
                        >

                          ${escapeHTML(s.code)}

                        </span>

                      </td>

                      <td>
                        ${escapeHTML(s.subject)}
                      </td>

                    </tr>

                  `
                )
                .join("")
            }

          </tbody>

        </table>

      </div>

    </div>

  `;


  DOM.timetableContainer.innerHTML =
    html;
}


/* ==========================================================================
   Notifications Renderer
   ========================================================================== */

function renderNotifications(items) {

  if (!DOM.notificationsContainer) {
    return;
  }


  const notifications =
    Array.isArray(items)
      ? items
      : [];


  let html = "";


  notifications.forEach(
    n => {

      html += `

        <div class="data-card">

          <div class="data-card-header">

            <h3
              class="data-card-title"
              style="font-size: 0.95rem;"
            >

              ${
                n.isUrgent
                  ? `
                    <span
                      class="status-badge fail"
                      style="margin-right: 6px;"
                    >
                      Important
                    </span>
                  `
                  : ""
              }

              ${escapeHTML(n.title)}

            </h3>


            <span class="field-help">

              ${escapeHTML(n.date)}

            </span>

          </div>


          <p
            style="
              font-size: 0.85rem;
              color: var(--text-secondary);
            "
          >

            ${escapeHTML(n.desc)}

          </p>

        </div>

      `;
    }
  );


  if (notifications.length === 0) {

    html = `

      <div class="empty-state">

        <i class="fa-solid fa-bell-slash empty-icon"></i>

        <h3 class="empty-title">
          No Notifications
        </h3>

        <p class="empty-desc">
          There are no new notifications right now.
        </p>

      </div>

    `;
  }


  DOM.notificationsContainer.innerHTML =
    html;
}
