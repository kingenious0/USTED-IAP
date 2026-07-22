import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// ─── Full logbook PDF (all weeks) ────────────────────────────────────────────
const generateHtml = (profile, allLogs) => {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const totalWeeks = profile?.weeks || 8;

  let weeksHtml = '';

  for (let i = 1; i <= totalWeeks; i++) {
    const wk = `week_${i}`;
    const weekData = allLogs[wk] || {};

    let rowsHtml = '';
    DAYS.forEach(day => {
      const entry = weekData[day];
      if (entry) {
        rowsHtml += `
          <tr>
            <td><strong>${day}</strong></td>
            <td>${entry.startTime || ''} - ${entry.endTime || ''}</td>
            <td>${entry.activityText || ''}</td>
            <td>${entry.learningOutcome || ''}</td>
            <td>${entry.skillsDemonstrated || ''}</td>
            <td>${entry.remarks || ''}</td>
          </tr>
        `;
      } else {
        rowsHtml += `
          <tr>
            <td><strong>${day}</strong></td>
            <td colspan="5" style="text-align: center; color: #999;">No entry recorded</td>
          </tr>
        `;
      }
    });

    weeksHtml += `
      <div class="week-section">
        <h2>Week ${i}</h2>
        <table>
          <tr>
            <th>Day</th>
            <th>Time</th>
            <th>Tasks / Activities</th>
            <th>Learning Outcome</th>
            <th>Skills</th>
            <th>Remarks</th>
          </tr>
          ${rowsHtml}
        </table>
      </div>
    `;
  }

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          h1 {
            text-align: center;
            color: #1A1A1A;
          }
          .profile-info {
            margin-bottom: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border: 1px solid #eee;
            border-radius: 5px;
          }
          .profile-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          .week-section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          h2 {
            border-bottom: 2px solid #1A1A1A;
            padding-bottom: 5px;
            color: #1A1A1A;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            font-size: 12px;
            vertical-align: top;
          }
          th {
            background-color: #f2f2f2;
            text-align: left;
            color: #1A1A1A;
          }
        </style>
      </head>
      <body>
        <h1>Industrial Attachment Logbook</h1>
        <div class="profile-info">
          <p><strong>Name:</strong> ${profile?.name || 'N/A'}</p>
          <p><strong>Index Number:</strong> ${profile?.indexNumber || 'N/A'}</p>
          <p><strong>Company:</strong> ${profile?.company || 'N/A'}</p>
          <p><strong>Programme:</strong> ${profile?.programme || 'N/A'}</p>
          <p><strong>Duration:</strong> ${totalWeeks} Weeks</p>
        </div>
        ${weeksHtml}
      </body>
    </html>
  `;
};

const printHtmlOnWeb = (html) => {
  if (typeof document === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('[printHtmlOnWeb] Error:', e);
    } finally {
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (_e) {}
      }, 2000);
    }
  }, 300);
};

export const generatePdf = async (profile, allLogs) => {
  try {
    const html = generateHtml(profile, allLogs);

    if (Platform.OS === 'web') {
      printHtmlOnWeb(html);
      return { success: true };
    }

    // On native, create a file and share it
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false
    });

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export Logbook PDF',
      UTI: 'com.adobe.pdf'
    });

    return { success: true };
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return { success: false, error: error.message };
  }
};

// ─── Single-week PDF generator ───────────────────────────────────────────────
/**
 * Render a single frozen week to a PDF file and return its local URI.
 *
 * Output exactly mirrors the USTED Daily Training Log Sheet blueprint:
 *   • University header  (logo · APPIAH-MENKA UNIVERSITY · INDUSTRIAL LIAISON UNIT)
 *   • Dotted-line profile fields  (Name, Index, Program/Level, Industry, Location, Supervisor, WEL)
 *   • 5-column bordered table     (Day 18% | Dates 15% | Tasks 32% | Skills 25% | Remarks 10%)
 *   • Footer signature section   (Student Signature, Supervisor Comments, Official Stamp box)
 *
 * @param {number} weekNumber
 * @param {object} weekData   — { Mon, Tue, Wed, Thu, Fri } log entries from AsyncStorage
 * @param {object} profile    — student profile saved at SetupScreen
 * @returns {{ success: boolean, uri?: string, error?: string }}
 */
const generateWeekHtml = (weekNumber, weekData, profile) => {
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const getEntry = (e) => {
    if (!e) return null;
    if (typeof e === 'string') return { activityText: e };
    return e;
  };

  const rows = DAYS.map((day) => {
    const e = getEntry(weekData[day]);
    if (!e || !(e.activityText || e.activity)) {
      return `<tr>
        <td><strong>${day}</strong></td>
        <td colspan="4" style="text-align:center;color:#999;">No entry recorded</td>
      </tr>`;
    }
    return `<tr>
      <td><strong>${day}</strong></td>
      <td>${e.startTime || ''} &ndash; ${e.endTime || ''}</td>
      <td>${e.activityText || e.activity || ''}</td>
      <td>${e.skillsDemonstrated || ''}</td>
      <td>${e.remarks || ''}</td>
    </tr>`;
  }).join('');

  // Profile data
  const p = profile || {};
  const sName       = p.name             || '';
  const sIndex      = p.indexNumber      || '';
  const sProgram    = p.program          || '';
  const sLevel      = p.level            || '';
  const sIndustry   = p.industryName     || p.company || '';
  const sLocation   = p.industryLocation || '';
  const sSupervisor = p.supervisorName   || '';
  const sWel        = p.welCommencement  || '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background: #fff;
      color: #000;
      padding: 28px 32px;
      font-size: 13px;
    }

    /* Header */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2.5px solid #000;
      margin-bottom: 6px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-outer {
      width: 54px; height: 54px;
      border-radius: 50%;
      border: 2.5px solid #333;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      position: relative;
    }
    .logo-inner {
      width: 36px; height: 36px;
      border-radius: 50%;
      border: 2px solid #333;
      position: absolute;
    }
    .logo-check {
      font-size: 20px; font-weight: bold; color: #333;
      position: relative; z-index: 1;
    }
    .uni-name {
      font-size: 19px; font-weight: bold; letter-spacing: 1px;
      line-height: 1.25;
    }
    .uni-sub {
      font-size: 8.5px; margin-top: 3px; letter-spacing: 0.3px;
    }
    .header-right {
      font-size: 12px; font-weight: bold;
      margin-top: 8px; text-align: right;
    }

    /* Divider */
    .divider { border: none; border-top: 1px solid #000; margin: 6px 0 18px; }

    /* Titles */
    .main-title { text-align: center; font-weight: bold; font-size: 17px; margin-bottom: 4px; }
    .sub-title  { text-align: center; font-weight: bold; font-size: 15px; margin-bottom: 20px; }

    /* Profile field rows */
    .field-row {
      display: flex;
      align-items: flex-end;
      margin-bottom: 11px;
      gap: 6px;
    }
    .field-label {
      font-weight: bold; font-size: 13px;
      white-space: nowrap; flex-shrink: 0;
    }
    .field-value {
      flex: 1;
      border-bottom: 1px dotted #000;
      min-height: 18px;
      padding-bottom: 2px;
      font-size: 13px;
      display: flex;
      align-items: flex-end;
    }
    .field-value span { padding-left: 4px; }

    /* Log table */
    .log-table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000;
      margin-top: 20px;
      table-layout: fixed;
    }
    .log-table th, .log-table td {
      border: 1px solid #000;
      padding: 6px 7px;
      vertical-align: top;
      font-size: 11.5px;
      word-wrap: break-word;
    }
    .log-table thead tr { background-color: #f0f0f0; }
    .log-table th {
      font-weight: bold; text-align: left;
      font-size: 11px; line-height: 1.4;
    }
    .col-day     { width: 18%; }
    .col-dates   { width: 15%; }
    .col-tasks   { width: 32%; }
    .col-skills  { width: 25%; }
    .col-remarks { width: 10%; }
    .log-table tbody td { min-height: 64px; }

    /* Footer */
    .footer-section { margin-top: 26px; }
    .footer-sig-row {
      display: flex; align-items: flex-end;
      gap: 10px; margin-bottom: 10px;
    }
    .footer-sig-label {
      font-weight: bold; font-size: 13px;
      white-space: nowrap; flex-shrink: 0;
    }
    .footer-sig-line {
      flex: 1;
      border-bottom: 1px dotted #000;
      min-height: 22px;
    }
    .footer-comments-block { margin-top: 28px; }
    .footer-comments-label { font-weight: bold; font-size: 13px; margin-bottom: 14px; }
    .footer-comment-line {
      border-bottom: 1px dotted #000;
      min-height: 22px; margin-bottom: 14px;
    }
    .footer-stamp-label { font-weight: bold; font-size: 13px; margin-top: 18px; }
    .footer-stamp-box {
      border: 1px dashed #333333;
      min-height: 100px; margin-top: 15px;
      background: transparent;
    }

    .gen-tag { margin-top: 20px; font-size: 9px; color: #aaa; text-align: center; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header-row">
    <div class="header-left">
      <div class="logo-outer">
        <div class="logo-inner"></div>
        <span class="logo-check">&#10003;</span>
      </div>
      <div>
        <div class="uni-name">APPIAH-MENKA</div>
        <div class="uni-name">UNIVERSITY</div>
        <div class="uni-sub">of Skills Training and Entrepreneurial Development</div>
      </div>
    </div>
    <div class="header-right">INDUSTRIAL LIAISON UNIT</div>
  </div>

  <hr class="divider"/>

  <!-- TITLES -->
  <p class="main-title">INDUSTRIAL LIAISON OFFICE</p>
  <p class="sub-title">DAILY TRAINING LOG SHEET</p>

  <!-- PROFILE FIELDS -->
  <div class="field-row">
    <span class="field-label">Student's Name:</span>
    <div class="field-value"><span>${sName}</span></div>
  </div>
  <div class="field-row">
    <span class="field-label">Index Number:</span>
    <div class="field-value"><span>${sIndex}</span></div>
  </div>
  <div class="field-row">
    <span class="field-label">Program:</span>
    <div class="field-value" style="flex:2;"><span>${sProgram}</span></div>
    <span class="field-label" style="margin-left:18px;">Level:</span>
    <div class="field-value" style="flex:1;"><span>${sLevel}</span></div>
  </div>
  <div class="field-row">
    <span class="field-label">Name of Industry:</span>
    <div class="field-value"><span>${sIndustry}</span></div>
  </div>
  <div class="field-row">
    <span class="field-label">Location of Industry:</span>
    <div class="field-value"><span>${sLocation}</span></div>
  </div>
  <div class="field-row">
    <span class="field-label">Name of Supervisor:</span>
    <div class="field-value"><span>${sSupervisor}</span></div>
  </div>
  <div class="field-row">
    <span class="field-label">WEL Commencement (Month &amp; Year):</span>
    <div class="field-value"><span>${sWel}</span></div>
  </div>

  <!-- LOG TABLE -->
  <table class="log-table">
    <colgroup>
      <col class="col-day"/>
      <col class="col-dates"/>
      <col class="col-tasks"/>
      <col class="col-skills"/>
      <col class="col-remarks"/>
    </colgroup>
    <thead>
      <tr>
        <th class="col-day">Day</th>
        <th class="col-dates">Dates: Start &amp; End Time</th>
        <th class="col-tasks">Describe key tasks/activities performed for the day (Learning Outcome)</th>
        <th class="col-skills">Skills Demonstrated</th>
        <th class="col-remarks">Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer-section">
    <div class="footer-sig-row">
      <span class="footer-sig-label">Student's Signature:</span>
      <div class="footer-sig-line" style="flex:2; margin-right:14px;"></div>
      <span class="footer-sig-label">Date:</span>
      <div class="footer-sig-line" style="flex:1;"></div>
    </div>
    <div class="footer-comments-block">
      <div class="footer-comments-label">Industry Supervisor's Comments:</div>
      <div class="footer-comment-line"></div>
      <div class="footer-comment-line"></div>
      <div class="footer-comment-line"></div>
    </div>
    <div class="footer-stamp-label">Supervisor's Signature &amp; Official Stamp:</div>
    <div class="footer-stamp-box"></div>
  </div>

  <p class="gen-tag">
    Week ${weekNumber} &nbsp;&middot;&nbsp; Generated by U-IAP &nbsp;&middot;&nbsp;
    ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
  </p>

</body>
</html>`;
};

export const generateWeekPdf = async (weekNumber, weekData, profile) => {
  try {
    const html = generateWeekHtml(weekNumber, weekData, profile);

    if (Platform.OS === 'web') {
      printHtmlOnWeb(html);
      return { success: true, uri: null };
    }

    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return { success: true, uri };
  } catch (error) {
    console.error('[generateWeekPdf] Error:', error);
    return { success: false, error: error.message };
  }
};
