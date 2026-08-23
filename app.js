let activeDocId = null;
let isInitialLoad = true;

// Auth Guard Handler
// function checkAuthGuard() {
//     const path = window.location.pathname.toLowerCase();
//     const isLoginPage = path.endsWith("login.html") || path === "/" || path === "";
//     const activeUser = sessionStorage.getItem("activeUser");

//     if (!activeUser && !isLoginPage) {
//         window.location.href = "login.html";
//     }
// }
// checkAuthGuard();

// Desktop Notification Handler
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("This browser does not support desktop notifications.");
        return;
    }
    Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
            const btn = document.getElementById("enableNotiBtn");
            if (btn) {
                btn.innerText = "✓ Desktop Alerts Enabled";
                btn.classList.replace("bg-indigo-50", "bg-emerald-50");
                btn.classList.replace("text-indigo-600", "text-emerald-600");
                btn.classList.replace("border-indigo-200", "border-emerald-200");
            }
            new Notification("Notifications Enabled", {
                body: "You will now receive desktop alerts for live system updates.",
                icon: "https://cdn-icons-png.flaticon.com/512/1827/1827504.png"
            });
        }
    });
}

function sendDesktopNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: "https://cdn-icons-png.flaticon.com/512/1827/1827504.png"
        });
    }
}

// Session Log Out
function logout() {
    if (confirm("Are you sure you want to log out?")) {
        sessionStorage.removeItem("activeUser");
        window.location.href = "login.html";
    }
}


// Submit Maintenance Request (User View)
async function submitRequest(event) {
    event.preventDefault();
    const lab = document.getElementById("lab")?.value;
    const problemType = document.getElementById("problemType")?.value;
    const equipment = document.getElementById("equipment")?.value;
    const description = document.getElementById("description")?.value;

    if (!lab || !problemType || !equipment || !description) {
        alert("Please fill in all required fields!");
        return;
    }

    try {
        await db.collection("reports").add({
            lab: lab,
            equipment: equipment,
            problem: `${problemType}: ${description}`,
            status: "Pending",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Maintenance request submitted successfully!");
        document.querySelector("form")?.reset();
        showPage("requests");
    } catch (e) {
        console.error("Firestore error:", e);
        alert("Failed to submit request.");
    }
}

// Direct Laptop Report (Simplified User View)
async function sendReport() {
    const laptop = document.getElementById("laptop")?.value;
    const problem = document.getElementById("problem")?.value;

    if (!laptop || !problem) {
        alert("Please fill in all information!");
        return;
    }

    try {
        await db.collection("reports").add({
            lab: "Direct Report",
            equipment: laptop,
            problem: problem,
            status: "Pending",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Report sent to Admin!");
        if (document.getElementById("laptop")) document.getElementById("laptop").value = "";
        if (document.getElementById("problem")) document.getElementById("problem").value = "";
    } catch (e) {
        console.error("Firestore error:", e);
    }
}

// Mark Repair Completed (Admin View)
async function finishRepair(docId) {
    const targetId = docId || activeDocId;
    if (!targetId) {
        alert("No pending report selected!");
        return;
    }
    try {
        await db.collection("reports").doc(targetId).update({
            status: "Completed"
        });
    } catch (e) {
        console.error("Firestore update error:", e);
    }
}

// Global Real-time Listener & Desktop Alerts
if (typeof db !== "undefined") {
    db.collection("reports").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        let pending = 0;
        let completed = 0;

        const requestTable = document.getElementById("requestTable");
        const requestList = document.getElementById("requestList");
        const notificationList = document.getElementById("notificationList");
        const adminReportTable = document.getElementById("adminReportTable");

        if (requestTable) requestTable.innerHTML = "";
        if (requestList) requestList.innerHTML = "";
        if (notificationList) notificationList.innerHTML = "";
        if (adminReportTable) adminReportTable.innerHTML = "";

        // Track real-time changes for Desktop Notification
        snapshot.docChanges().forEach((change) => {
            if (!isInitialLoad && change.type === "added") {
                const data = change.doc.data();
                sendDesktopNotification("🚨 New Maintenance Request", `Equipment: ${data.equipment || 'Unknown'} - ${data.problem || 'No description'}`);
            }
            if (!isInitialLoad && change.type === "modified") {
                const data = change.doc.data();
                sendDesktopNotification("🔄 Request Status Updated", `Ticket ${change.doc.id.slice(0,6)} is now ${data.status}`);
            }
        });

        snapshot.forEach((doc) => {
            const data = doc.data();
            const docId = doc.id;

            if (data.status === "Pending") {
                pending++;
                activeDocId = docId;
            } else if (data.status === "Completed") {
                completed++;
            }

            const isCompleted = data.status === "Completed";
            const statusBadge = isCompleted 
                ? `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Completed</span>`
                : `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-600 border border-amber-200">Pending</span>`;

            // Admin Dashboard Table
            if (adminReportTable) {
                const row = document.createElement("tr");
                row.className = "hover:bg-slate-50/80 transition-colors";
                row.innerHTML = `
                    <td class="p-4 font-mono text-xs font-semibold text-slate-500">#${docId.slice(0, 6)}</td>
                    <td class="p-4 font-medium text-slate-800">${data.lab || 'N/A'}</td>
                    <td class="p-4 text-slate-600">${data.equipment || 'N/A'}</td>
                    <td class="p-4 text-slate-600 max-w-xs truncate">${data.problem || 'N/A'}</td>
                    <td class="p-4">${statusBadge}</td>
                    <td class="p-4 text-right">
                        ${!isCompleted ? `<button onclick="finishRepair('${docId}')" class="px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-semibold hover:bg-emerald-700 transition-colors">Mark Done</button>` : `<span class="text-xs text-slate-400">Resolved</span>`}
                    </td>
                `;
                adminReportTable.appendChild(row);
            }

            // User Facing Views
            if (requestTable) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="p-[14px]">${docId.slice(0, 6)}</td>
                    <td class="p-[14px]">${data.equipment || 'N/A'}</td>
                    <td class="p-[14px]">${data.problem || 'N/A'}</td>
                    <td class="p-[14px]">${statusBadge}</td>
                `;
                requestTable.appendChild(row);
            }

            if (requestList) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td class="p-[14px]">${docId.slice(0, 6)}</td>
                    <td class="p-[14px]">${data.lab || 'N/A'}</td>
                    <td class="p-[14px]">${data.equipment || 'N/A'}</td>
                    <td class="p-[14px]">${data.problem || 'N/A'}</td>
                    <td class="p-[14px]">${statusBadge}</td>
                `;
                requestList.appendChild(row);
            }

            if (notificationList) {
                const noti = document.createElement("div");
                noti.className = "bg-white p-4 border-l-4 border-indigo-600 rounded-lg shadow-sm text-slate-700 flex justify-between items-center";
                noti.innerHTML = `<div><p class="font-semibold text-sm">${data.equipment || 'Device'} Maintenance Update</p><p class="text-xs text-slate-500 mt-0.5">Status set to ${data.status || 'Pending'}</p></div>${statusBadge}`;
                notificationList.appendChild(noti);
            }
        });

        // Update Dashboard Indicators
        if (document.getElementById("notiCount")) document.getElementById("notiCount").innerText = pending;
        if (document.getElementById("pendingTotal")) document.getElementById("pendingTotal").innerText = pending;
        if (document.getElementById("completedTotal")) document.getElementById("completedTotal").innerText = completed;
        if (document.getElementById("requestTotal")) document.getElementById("requestTotal").innerText = snapshot.size;

        if (document.getElementById("adminTotal")) document.getElementById("adminTotal").innerText = snapshot.size;
        if (document.getElementById("adminPending")) document.getElementById("adminPending").innerText = pending;
        if (document.getElementById("adminCompleted")) document.getElementById("adminCompleted").innerText = completed;

        isInitialLoad = false;
    });
}

// DOM Handlers for Dynamic Forms & Actions
document.addEventListener("DOMContentLoaded", () => {
    // Check Notification status on load
    if ("Notification" in window && Notification.permission === "granted") {
        const btn = document.getElementById("enableNotiBtn");
        if (btn) {
            btn.innerText = "✓ Desktop Alerts Enabled";
            btn.classList.replace("bg-indigo-50", "bg-emerald-50");
            btn.classList.replace("text-indigo-600", "text-emerald-600");
            btn.classList.replace("border-indigo-200", "border-emerald-200");
        }
    }

    const getStartedBtn = document.getElementById("getStartedBtn");
    if (getStartedBtn) {
        getStartedBtn.addEventListener("click", (e) => {
            e.preventDefault();
            sessionStorage.setItem("activeUser", JSON.stringify({ name: "Lab User" }));
            window.location.href = "dashboard.html"; 
        });
    }

    const getStartedBtnAdmin = document.getElementById("getStartedBtnAdmin");
    if (getStartedBtnAdmin) {
        getStartedBtnAdmin.addEventListener("click", (e) => {
            e.preventDefault();
            sessionStorage.setItem("activeUser", JSON.stringify({ name: "Lab User" }));
            window.location.href = "admin.html"; 
        });
    }

    const labSelect = document.getElementById("lab");
    const problemSelect = document.getElementById("problemType");
    const container = document.getElementById("dynamicEquipmentContainer");

    const equipmentOptions = {
        machineA: ["Laptop", "Adaptors"],
        standard: ["Monitor", "Mouse", "Keyboard", "CPU(Motherboard)", "Power Supply Unit"],
        exsoft: ["Mouse", "Keyboard", "CPU(Motherboard)", "Power Supply Unit", "Headphone", "Microphone"]
    };

    function updateEquipmentField() {
        if (!container) return;
        const selectedLab = labSelect ? labSelect.value : "";
        const selectedProblem = problemSelect ? problemSelect.value : "";

        if (!selectedLab || !selectedProblem) {
            container.innerHTML = `
                <label class="block mt-[15px] mb-[7px] font-bold text-gray-700">Select Equipment</label>
                <select id="equipment" required class="w-full p-[12px] border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#1e2d46]">
                    <option value="">Select Equipment</option>
                </select>
            `;
            return;
        }

        if (selectedProblem === "Hardware") {
            let items = [];
            if (selectedLab === "Machine A") items = equipmentOptions.machineA;
            else if (selectedLab === "Exsoft Lab") items = equipmentOptions.exsoft;
            else items = equipmentOptions.standard;

            const optionsHTML = items.map(item => `<option value="${item}">${item}</option>`).join("");
            
            container.innerHTML = `
                <label class="block mt-[15px] mb-[7px] font-bold text-gray-700">Select Equipment</label>
                <select id="equipment" required class="w-full p-[12px] border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#1e2d46]">
                    <option value="">Select Equipment</option>
                    ${optionsHTML}
                </select>
            `;
        } else if (selectedProblem === "Software") {
            container.innerHTML = `
                <label class="block mt-[15px] mb-[7px] font-bold text-gray-700">Software Required</label>
                <input type="text" id="equipment" placeholder="Specify software required..." required class="w-full p-[12px] border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#1e2d46]" />
            `;
        } else if (selectedProblem === "Network") {
            container.innerHTML = `
                <label class="block mt-[15px] mb-[7px] font-bold text-gray-700">Network Issue Details</label>
                <input type="text" id="equipment" placeholder="Describe network issue detail..." required class="w-full p-[12px] border border-gray-300 rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#1e2d46]" />
            `;
        }
    }

    if (labSelect && problemSelect) {
        labSelect.addEventListener("change", updateEquipmentField);
        problemSelect.addEventListener("change", updateEquipmentField);
    }
});

// Tab Navigation Logic
function showPage(pageId) {
    // 1. Hide all pages and reveal the active target
    document.querySelectorAll(".page").forEach(page => page.classList.add("hidden"));
    const selected = document.getElementById(pageId);
    if (selected) {
        selected.classList.remove("hidden");
    }

    // 2. Update Page Header Title (if present)
    const titles = {
        home: "Dashboard", 
        request: "Maintenance Request",
        requests: "Request List", 
        equipment: "Equipment", 
        notification: "Notifications"
    };
    if (document.getElementById("pageTitle")) {
        document.getElementById("pageTitle").innerText = titles[pageId] || "Dashboard";
    }

    // 3. Highlight the Active Nav Tab
    const navButtons = document.querySelectorAll("nav button");
    navButtons.forEach(button => {
        button.classList.remove("bg-[#f3f6fa]", "text-[#1e2d46]", "font-semibold", "shadow-sm");
        button.classList.add("text-gray-700");
    });

    const activeButton = document.querySelector(`nav button[onclick="showPage('${pageId}')"]`);
    if (activeButton) {
        activeButton.classList.add("bg-[#f3f6fa]", "text-[#1e2d46]", "font-semibold", "shadow-sm");
        activeButton.classList.remove("text-gray-700");
    }
}

// Call on initial load to highlight Home
document.addEventListener('DOMContentLoaded', () => {
  showPage('home');
});