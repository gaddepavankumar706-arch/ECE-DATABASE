
/**
 * SBTET Student Connect - Academic Service Integration Layer
 * 
 * ARCHITECTURE NOTE:
 * This layer isolates all SBTET-specific academic queries.
 * In production, these methods will interface with an authorized SBTET backend
 * API or secure middleware microservice.
 * 
 * Strictly labeled demo mocks are provided for local UI development.
 * Do NOT bypass CAPTCHA, authentication, or use unauthorized scrapers.
 */

export const sbtetService = {
  /**
   * Fetches Student Examination Results
   * @param {string} pin - Student SBTET PIN
   * @returns {Promise<Object>}
   */
  async getStudentResults(pin) {
    // In future integration:
    // const response = await fetch(`https://api.yourdomain.com/sbtet/results?pin=${encodeURIComponent(pin)}`);
    // return await response.json();

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          isDemoData: true,
          pin: pin,
          semesters: [
            {
              sem: "4th Semester (C-24)",
              examPeriod: "March/April Regular",
              gpa: "8.42",
              status: "PASSED",
              subjects: [
                { code: "EC-401", name: "Linear ICs & Applications", internal: 18, external: 62, total: 80, result: "PASS" },
                { code: "EC-402", name: "Microcontrollers & Embedded Systems", internal: 19, external: 58, total: 77, result: "PASS" },
                { code: "EC-403", name: "Communication Systems", internal: 17, external: 64, total: 81, result: "PASS" },
                { code: "EC-408", name: "Embedded Systems Lab", internal: 38, external: 55, total: 93, result: "PASS" }
              ]
            },
            {
              sem: "3rd Semester (C-24)",
              examPeriod: "Nov/Dec Regular",
              gpa: "8.10",
              status: "PASSED",
              subjects: [
                { code: "EC-301", name: "Digital Electronics", internal: 16, external: 59, total: 75, result: "PASS" },
                { code: "EC-302", name: "Electronic Circuits", internal: 18, external: 51, total: 69, result: "PASS" },
                { code: "EC-307", name: "Electronic Circuits Lab", internal: 36, external: 54, total: 90, result: "PASS" }
              ]
            }
          ]
        });
      }, 350);
    });
  },

  /**
   * Fetches Subject Assessment Marks
   * @param {string} pin - Student SBTET PIN
   * @returns {Promise<Object>}
   */
  async getStudentMarks(pin) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          isDemoData: true,
          pin: pin,
          currentMidMarks: [
            { subject: "Linear ICs & Applications (EC-401)", slipTest1: "18/20", slipTest2: "19/20", assignment: "5/5", midTotal: "37/40" },
            { subject: "Microcontrollers (EC-402)", slipTest1: "16/20", slipTest2: "17/20", assignment: "5/5", midTotal: "34/40" },
            { subject: "Communication Systems (EC-403)", slipTest1: "19/20", slipTest2: "19/20", assignment: "5/5", midTotal: "38/40" },
            { subject: "Industrial Electronics (EC-404)", slipTest1: "15/20", slipTest2: "18/20", assignment: "4/5", midTotal: "33/40" }
          ]
        });
      }, 350);
    });
  },

  /**
   * Fetches Student Biometric & Course Attendance
   * @param {string} pin - Student SBTET PIN
   * @returns {Promise<Object>}
   */
  async getAttendance(pin) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          isDemoData: true,
          pin: pin,
          aggregatePercentage: 83.4,
          totalWorkingDays: 78,
          attendedDays: 65,
          condonationEligible: true,
          months: [
            { month: "January", totalPeriods: 110, attendedPeriods: 92, percentage: "83.6%" },
            { month: "February", totalPeriods: 104, attendedPeriods: 88, percentage: "84.6%" },
            { month: "March", totalPeriods: 96, attendedPeriods: 79, percentage: "82.2%" }
          ]
        });
      }, 350);
    });
  },

  /**
   * Fetches Examination Applications & Hall Ticket Info
   * @param {string} pin - Student SBTET PIN
   * @returns {Promise<Object>}
   */
  async getExamDetails(pin) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          isDemoData: true,
          pin: pin,
          upcomingExams: [
            {
              sessionName: "Diploma Regular & Supplementary Examinations",
              monthYear: "April/May 2026",
              feeStatus: "Paid (Txn Ref: TS9823412)",
              hallTicketAvailable: true,
              hallTicketId: "HT-2026-TS-" + pin.replace(/[^a-zA-Z0-9]/g, ""),
              examCenter: "Government Polytechnic, Masab Tank, Hyderabad"
            }
          ]
        });
      }, 350);
    });
  },

  /**
   * Fetches Examination Time Table
   * @param {string} scheme - Curriculum Scheme (e.g. C24)
   * @param {string} branch - Branch Code (e.g. ECE)
   * @returns {Promise<Object>}
   */
  async getTimeTable(scheme, branch) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          isDemoData: true,
          scheme: scheme,
          branch: branch,
          schedule: [
            { date: "2026-05-11", time: "09:30 AM - 12:30 PM", code: "EC-401", subject: "Linear ICs & Applications" },
            { date: "2026-05-13", time: "09:30 AM - 12:30 PM", code: "EC-402", subject: "Microcontrollers & Embedded Systems" },
            { date: "2026-05-15", time: "09:30 AM - 12:30 PM", code: "EC-403", subject: "Communication Systems" },
            { date: "2026-05-18", time: "09:30 AM - 12:30 PM", code: "EC-404", subject: "Industrial Management & Entrepreneurship" }
          ]
        });
      }, 350);
    });
  },

  /**
   * Fetches Official Board Notifications
   * @returns {Promise<Array>}
   */
  async getNotifications() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          {
            id: "NOTIF-01",
            title: "Diploma Regular & Supplementary Exam Notification April/May 2026",
            date: "2026-03-28",
            isUrgent: true,
            desc: "Payment of examination fee for Regular and Supply candidates of C-18, C-21, and C-24 schemes without penalty up to 15-04-2026."
          },
          {
            id: "NOTIF-02",
            title: "Academic Calendar 2026-2027 Schedule Release",
            date: "2026-03-15",
            isUrgent: false,
            desc: "The comprehensive academic schedule for polytechnic institutions across Telangana is now officially notified."
          },
          {
            id: "NOTIF-03",
            title: "Guidelines for Industrial Training Submissions",
            date: "2026-03-02",
            isUrgent: false,
            desc: "Final semester students must upload institutional training certificates via the college administration portal."
          }
        ]);
      }, 300);
    });
  }
};
