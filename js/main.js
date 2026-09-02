/**
 * Siya Wellness Club - Unified Application Logic
 * Production Ready - Built to ensure seamless operation
 */

// =========================================================================
// 1. STORE (Data Management & LocalStorage)
// =========================================================================
const Store = {
    isLoggedIn: () => localStorage.getItem('swc_logged_in') === 'true',
    login: () => localStorage.setItem('swc_logged_in', 'true'),
    logout: () => localStorage.removeItem('swc_logged_in'),

    getTheme: () => localStorage.getItem('swc_theme') || 'light',
    setTheme: (theme) => localStorage.setItem('swc_theme', theme),

    getReports: () => {
        const reports = localStorage.getItem('swc_reports');
        return reports ? JSON.parse(reports) : [];
    },
    saveReport: (report) => {
        const reports = Store.getReports();
        report.id = report.id || 'REP-' + Date.now();
        report.createdAt = report.createdAt || new Date().toISOString();
        reports.push(report);
        localStorage.setItem('swc_reports', JSON.stringify(reports));
        return report.id;
    },
    getReportById: (id) => Store.getReports().find(r => r.id === id),
    deleteReport: (id) => {
        const reports = Store.getReports().filter(r => r.id !== id);
        localStorage.setItem('swc_reports', JSON.stringify(reports));
    },
    
    setCurrentPreview: (report) => localStorage.setItem('swc_current_preview', JSON.stringify(report)),
    getCurrentPreview: () => {
        const report = localStorage.getItem('swc_current_preview');
        return report ? JSON.parse(report) : null;
    },
    clearCurrentPreview: () => localStorage.removeItem('swc_current_preview')
};

// =========================================================================
// 1.5 CREDIT MANAGER
// =========================================================================
const CreditManager = {
    credits: null,
    isFetching: false,
    username: 'siyawellnessclub', // Default for now since login is hardcoded

    async init() {
        this.attachModalListeners();
        if (Store.isLoggedIn()) {
            await this.fetchCredits();
        }
    },

    attachModalListeners() {
        const btnClose = document.getElementById('btn-close-modal');
        if (btnClose) {
            btnClose.addEventListener('click', () => this.hideModal());
        }

        const btnWhatsapp = document.getElementById('btn-whatsapp-admin');
        if (btnWhatsapp) {
            btnWhatsapp.addEventListener('click', () => {
                const message = encodeURIComponent('नमस्कार, माझे Siya Wellness Club हेल्थ रिपोर्ट क्रेडिट्स संपले आहेत. कृपया मला नवीन क्रेडिट पॅक बद्दल माहिती द्या.');
                window.open(`https://wa.me/919673778371?text=${message}`, '_blank');
            });
        }
    },

    async fetchCredits() {
        if (this.isFetching) return;
        this.isFetching = true;
        
        try {
            if (!window.supabaseClient) throw new Error("Supabase client not initialized");
            
            const { data, error } = await window.supabaseClient
                .from('user_credits')
                .select('credits')
                .eq('username', this.username)
                .single();
                
            if (error) throw error;
            
            this.credits = data ? data.credits : 0;
            this.updateUI();
        } catch (err) {
            console.error("Error fetching credits:", err);
            // Keep credits null if error occurs (e.g., table not created yet)
            this.updateUI(true); 
        } finally {
            this.isFetching = false;
        }
    },

    async deductCredit() {
        if (this.credits === null || this.credits <= 0) return false;
        
        const newCredits = this.credits - 1;
        
        try {
            const { error } = await window.supabaseClient
                .from('user_credits')
                .update({ credits: newCredits })
                .eq('username', this.username);
                
            if (error) throw error;
            
            this.credits = newCredits;
            this.updateUI();
            return true;
        } catch (err) {
            console.error("Error deducting credit:", err);
            return false;
        }
    },

    updateUI(isError = false) {
        const statCredits = document.getElementById('stat-credits');
        const badge = document.getElementById('credit-status-badge');
        const totalReports = document.getElementById('stat-credit-total');
        
        if (totalReports) {
            totalReports.innerText = Store.getReports().length;
        }

        if (isError || this.credits === null) {
            if (statCredits) statCredits.innerText = '--';
            if (badge) {
                badge.innerText = 'Trb. Error';
                badge.className = 'credit-status status-low';
            }
            return;
        }

        if (statCredits) {
            statCredits.innerText = this.credits;
        }

        if (badge) {
            if (this.credits > 10) {
                badge.innerText = 'Active';
                badge.className = 'credit-status';
            } else if (this.credits > 0) {
                badge.innerText = 'Low Credits';
                badge.className = 'credit-status status-low';
            } else {
                badge.innerText = 'Exhausted';
                badge.className = 'credit-status status-zero';
            }
        }
    },

    showModal() {
        const modal = document.getElementById('no-credits-modal');
        if (modal) modal.classList.add('active');
    },

    hideModal() {
        const modal = document.getElementById('no-credits-modal');
        if (modal) modal.classList.remove('active');
    }
};

// =========================================================================
// 2. AUTHENTICATION
// =========================================================================
const Auth = {
    init() {
        const loginForm = document.getElementById('login-form');
        const otpForm = document.getElementById('otp-form');
        const togglePwdBtn = document.getElementById('toggle-pwd-btn');
        const pwdInput = document.getElementById('login-password');
        const logoutBtn = document.getElementById('logout-btn');

        if (togglePwdBtn && pwdInput) {
            togglePwdBtn.addEventListener('click', () => {
                const type = pwdInput.getAttribute('type') === 'password' ? 'text' : 'password';
                pwdInput.setAttribute('type', type);
                togglePwdBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
            });
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value;
                const password = pwdInput.value;

                if (username === 'siyawellnessclub' && password === 'siya@123') {
                    App.showToast('Credentials verified. Sending OTP...', 'success');
                    App.switchScreen('otp-screen');
                    setTimeout(() => document.querySelector('.otp-input').focus(), 400);
                } else {
                    App.showToast('Invalid Username or Password', 'error');
                }
            });
        }

        const otpInputs = document.querySelectorAll('.otp-input');
        otpInputs.forEach((input, index) => {
            input.addEventListener('keyup', (e) => {
                if (e.key >= 0 && e.key <= 9 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                } else if (e.key === 'Backspace' && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
        });

        if (otpForm) {
            otpForm.addEventListener('submit', (e) => {
                e.preventDefault();
                let otp = '';
                otpInputs.forEach(input => otp += input.value);

                if (otp === '1992') {
                    App.showLoading('Verifying OTP...');
                    setTimeout(() => {
                        App.hideLoading();
                        Store.login();
                        App.showToast('Login Successful!', 'success');
                        Dashboard.init();
                        CreditManager.fetchCredits(); // Fetch credits on login
                        App.switchScreen('dashboard-screen');
                        
                        document.getElementById('login-username').value = '';
                        pwdInput.value = '';
                        otpInputs.forEach(input => input.value = '');
                    }, 1000);
                } else {
                    App.showToast('Invalid OTP. Please use 1992.', 'error');
                    otpInputs.forEach(input => input.value = '');
                    otpInputs[0].focus();
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Store.logout();
                App.switchScreen('login-screen');
                App.showToast('Logged out successfully', 'success');
            });
        }
    }
};

// =========================================================================
// 3. DASHBOARD
// =========================================================================
const Dashboard = {
    init() {
        this.renderStats();
        this.renderReports();
        this.attachSearch();
    },

    renderStats() {
        const reports = Store.getReports();
        document.getElementById('stat-total').innerText = reports.length;
        const today = new Date().toLocaleDateString();
        const todayReports = reports.filter(r => new Date(r.createdAt).toLocaleDateString() === today);
        document.getElementById('stat-today').innerText = todayReports.length;
    },

    renderReports(searchTerm = '') {
        const container = document.getElementById('reports-list-container');
        if (!container) return;

        let reports = Store.getReports();
        reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            reports = reports.filter(r => r.name.toLowerCase().includes(lowerTerm) || r.mobile.includes(searchTerm));
        }

        if (reports.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                    <i class="fas fa-inbox fa-3x" style="margin-bottom: 1rem; opacity: 0.5;"></i>
                    <p>${searchTerm ? 'No reports found matching your search.' : 'No reports created yet. Create a new checkup to get started.'}</p>
                </div>`;
            return;
        }

        container.innerHTML = '';
        reports.forEach(report => {
            let statusClass = 'status-good';
            if (report.status === 'Excellent') statusClass = 'status-excellent';
            if (report.status === 'Moderate') statusClass = 'status-moderate';
            if (report.status === 'High Risk') statusClass = 'status-high-risk';

            const div = document.createElement('div');
            div.className = 'report-item';
            div.innerHTML = `
                <div class="report-info">
                    <div class="report-avatar">${report.name.charAt(0).toUpperCase()}</div>
                    <div class="report-details">
                        <h4>${report.name}</h4>
                        <p>${report.mobile} • ${new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap: 1rem;">
                    <div class="report-status ${statusClass}">Score: ${report.score}</div>
                    <div class="report-actions">
                        <button class="icon-btn btn-view" data-id="${report.id}" title="View Report"><i class="fas fa-eye"></i></button>
                        <button class="icon-btn btn-delete" data-id="${report.id}" title="Delete Report" style="color: var(--danger);"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>`;
            container.appendChild(div);
        });

        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => this.viewReport(e.currentTarget.getAttribute('data-id')));
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if(confirm('Are you sure you want to delete this report?')) {
                    Store.deleteReport(e.currentTarget.getAttribute('data-id'));
                    App.showToast('Report deleted', 'success');
                    this.init();
                }
            });
        });
    },

    attachSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            const newSearchInput = searchInput.cloneNode(true);
            searchInput.parentNode.replaceChild(newSearchInput, searchInput);
            newSearchInput.addEventListener('input', (e) => this.renderReports(e.target.value));
        }
    },

    viewReport(id) {
        const report = Store.getReportById(id);
        if (report) {
            Store.setCurrentPreview(report);
            Form.populatePreview(report);
            App.switchScreen('preview-screen');
        }
    }
};

// =========================================================================
// 4. FORM & HEALTH ANALYSIS
// =========================================================================
const Form = {
    init() {
        const form = document.getElementById('health-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processForm();
            });
        }

        const heightInput = document.getElementById('f-height');
        const weightInput = document.getElementById('f-weight');
        const calcBmi = () => {
            const h = parseFloat(heightInput.value);
            const w = parseFloat(weightInput.value);
            if (h > 0 && w > 0) {
                const bmi = w / ((h / 100) * (h / 100));
                document.getElementById('f-bmi').value = bmi.toFixed(1);
            }
        };

        if (heightInput) heightInput.addEventListener('input', calcBmi);
        if (weightInput) weightInput.addEventListener('input', calcBmi);
    },

    processForm() {
        // Check credits before proceeding
        if (CreditManager.credits !== null && CreditManager.credits <= 0) {
            CreditManager.showModal();
            return;
        }

        App.showLoading('Analyzing Health Data...');
        setTimeout(async () => {
            const data = {
                name: document.getElementById('f-name').value,
                mobile: document.getElementById('f-mobile').value,
                age: parseInt(document.getElementById('f-age').value),
                gender: document.getElementById('f-gender').value,
                location: document.getElementById('f-location').value,
                date: document.getElementById('f-date').value,
                coordinator: document.getElementById('f-coordinator').value,
                height: parseFloat(document.getElementById('f-height').value),
                weight: parseFloat(document.getElementById('f-weight').value),
                bmi: parseFloat(document.getElementById('f-bmi').value),
                totalFat: parseFloat(document.getElementById('f-totalfat').value),
                visceralFat: parseFloat(document.getElementById('f-visceralfat').value),
                metabolism: parseFloat(document.getElementById('f-metabolism').value),
                metabolicAge: parseInt(document.getElementById('f-metabolicage').value),
                trunkFat: parseFloat(document.getElementById('f-trunkfat').value),
                muscle: parseFloat(document.getElementById('f-muscle').value)
            };

            const analysis = this.analyzeHealth(data);
            data.score = analysis.score;
            data.status = analysis.status;
            data.recommendations = analysis.recommendations;
            data.paramsAnalysis = analysis.paramsAnalysis;

            // Deduct credit after successful report generation
            if (CreditManager.credits !== null) {
                await CreditManager.deductCredit();
            }

            Store.saveReport(data);
            Store.setCurrentPreview(data);

            this.populatePreview(data);
            App.hideLoading();
            App.showToast('Report Generated Successfully', 'success');
            App.switchScreen('preview-screen');
        }, 800);
    },

    analyzeHealth(data) {
        let score = 100;
        const recommendations = [];
        const paramsAnalysis = {};

        const evaluate = (key, value, normalMsg, highMsg, lowMsg, condition, deduct) => {
            let status = 'Normal';
            if (condition === 'high') {
                status = 'High';
                score -= deduct;
                if(highMsg) recommendations.push(highMsg);
            } else if (condition === 'low') {
                status = 'Low';
                score -= deduct;
                if(lowMsg) recommendations.push(lowMsg);
            }
            paramsAnalysis[key] = { value, status };
        };

        if (data.bmi < 18.5) evaluate('bmi', data.bmi, '', '', 'संतुलित आहार घ्यावा, वजन वाढवण्यावर लक्ष द्यावे.', 'low', 10);
        else if (data.bmi > 24.9) evaluate('bmi', data.bmi, '', 'वजन नियंत्रणावर लक्ष द्यावे, नियमित व्यायाम करावा.', '', 'high', 10);
        else evaluate('bmi', data.bmi, '', '', '', 'normal', 0);

        const fatHigh = data.gender === 'Male' ? (data.age > 40 ? 25 : 20) : (data.age > 40 ? 35 : 30);
        if (data.totalFat > fatHigh) evaluate('totalFat', data.totalFat, '', 'तेलकट पदार्थ कमी खावे, रोज ३० मिनिटे चालावे.', '', 'high', 15);
        else evaluate('totalFat', data.totalFat, '', '', '', 'normal', 0);

        if (data.visceralFat > 9) evaluate('visceralFat', data.visceralFat, '', 'पोटाचा घेर कमी करण्यासाठी कार्डिओ व्यायाम करावा.', '', 'high', 15);
        else evaluate('visceralFat', data.visceralFat, '', '', '', 'normal', 0);

        const muscleLow = data.gender === 'Male' ? 33 : 24;
        if (data.muscle < muscleLow) evaluate('muscle', data.muscle, '', '', 'प्रथिनयुक्त (Protein) आहार वाढवावा.', 'low', 10);
        else evaluate('muscle', data.muscle, '', '', '', 'normal', 0);
        
        if (data.metabolicAge > data.age + 5) evaluate('metabolicAge', data.metabolicAge, '', 'झोपेची वेळ सुधारावी, पाण्याचे सेवन वाढवावे.', '', 'high', 10);
        else evaluate('metabolicAge', data.metabolicAge, '', '', '', 'normal', 0);

        score = Math.max(0, score);

        let status = 'Excellent';
        if (score < 50) status = 'High Risk';
        else if (score < 70) status = 'Moderate';
        else if (score < 90) status = 'Good';

        if (recommendations.length === 0) {
            recommendations.push('आपले आरोग्य उत्तम आहे, हीच जीवनशैली चालू ठेवा.');
        }
        
        // Add fixed recommendations like Miracle Wellness
        recommendations.push('रोज सकाळी ४५ मिनिटे व्यायाम करावा');
        recommendations.push('नियमित सेहत की पाठशाला कार्यक्रम जॉईन करावा');
        recommendations.push('निरोगी जीवन जगण्यासाठी सेहत की पाठशाला जॉईन करावी');

        return { score, status, recommendations: [...new Set(recommendations)], paramsAnalysis };
    },

    populatePreview(data) {
        document.getElementById('p-date-display').innerText = `Date: ${new Date(data.date).toLocaleDateString('en-IN')}`;
        document.getElementById('p-name').innerText = data.name;
        document.getElementById('p-mobile').innerText = data.mobile;
        document.getElementById('p-age-gender').innerText = `${data.age} Yrs / ${data.gender}`;
        document.getElementById('p-height-weight').innerText = `${data.height} cm / ${data.weight} kg`;
        document.getElementById('p-location').innerText = data.location;
        document.getElementById('p-coordinator').innerText = data.coordinator;

        document.getElementById('p-score').innerText = data.score;
        const statusEl = document.getElementById('p-status');
        statusEl.innerText = data.status;
        
        statusEl.classList.remove('status-excellent', 'status-good', 'status-moderate', 'status-high-risk');
        let statusClass = 'status-good';
        if (data.status === 'Excellent') statusClass = 'status-excellent';
        if (data.status === 'Moderate') statusClass = 'status-moderate';
        if (data.status === 'High Risk') statusClass = 'status-high-risk';
        statusEl.classList.add(statusClass);

        const tbody = document.getElementById('p-params-tbody');
        tbody.innerHTML = '';
        
        const currentWeight = parseFloat(data.weight);
        const heightMeters = parseFloat(data.height) / 100;
        const minWeight = 18.5 * heightMeters * heightMeters;
        const maxWeight = 24.9 * heightMeters * heightMeters;
        const idealWeight = 22 * heightMeters * heightMeters;

        let weightStatus = 'Normal';
        let weightDiffText = 'Perfect Weight';
        if (currentWeight > maxWeight) {
            weightStatus = 'High';
            weightDiffText = `+${(currentWeight - idealWeight).toFixed(1)} kg (Overweight)`;
        } else if (currentWeight < minWeight) {
            weightStatus = 'Low';
            weightDiffText = `-${(idealWeight - currentWeight).toFixed(1)} kg (Underweight)`;
        }

        const isMale = data.gender === 'Male';
        const fatNormal = isMale ? '10 - 20%' : '20 - 30%';
        const muscleNormal = isMale ? '33 - 39%' : '24 - 30%';

        const pAnalysis = data.paramsAnalysis || {};
        
        const evaluatedParams = [
            { name: 'सध्याचे वजन (Current Weight)', val: currentWeight.toFixed(1) + ' kg', range: `${minWeight.toFixed(1)} - ${maxWeight.toFixed(1)} kg`, status: 'Info' },
            { name: 'अपेक्षित वजन (Ideal Weight)', val: idealWeight.toFixed(1) + ' kg', range: `${minWeight.toFixed(1)} - ${maxWeight.toFixed(1)} kg`, status: 'Info' },
            { name: 'वजनातील फरक (Weight Difference)', val: weightDiffText, range: '0 kg', status: weightStatus },
            { name: 'BMI', val: data.bmi, range: '18.5 - 24.9', status: (pAnalysis.bmi?.status || 'Normal') },
            { name: 'Total Fat %', val: data.totalFat, range: fatNormal, status: (pAnalysis.totalFat?.status || 'Normal') },
            { name: 'Visceral Fat Level', val: data.visceralFat, range: '1 - 9', status: (pAnalysis.visceralFat?.status || 'Normal') },
            { name: 'Resting Metabolism', val: data.metabolism + ' kcal', range: 'Depends on age/weight', status: 'Info' },
            { name: 'Metabolic Age', val: data.metabolicAge, range: `Close to ${data.age}`, status: (pAnalysis.metabolicAge?.status || 'Normal') },
            { name: 'Subcutaneous Fat %', val: data.trunkFat, range: 'Depends on gender', status: 'Info' },
            { name: 'Skeletal Muscle %', val: data.muscle, range: muscleNormal, status: (pAnalysis.muscle?.status || 'Normal') }
        ];

        evaluatedParams.forEach(p => {
            let color = 'inherit';
            let valColor = 'inherit';
            
            if (p.status === 'High' || p.status === 'Low') {
                color = 'var(--danger)';
                valColor = 'var(--danger)'; // Highlight the value in red too!
            }
            else if (p.status === 'Normal') color = 'var(--text-primary)';
            else if (p.status === 'Info') color = 'var(--text-secondary)';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.name}</td>
                <td style="font-weight: 600; color: ${valColor};">${p.val}</td>
                <td style="color: var(--text-secondary);">${p.range}</td>
                <td style="color: ${color}; font-weight: 500;">${p.status}</td>
            `;
            tbody.appendChild(tr);
        });

        const recList = document.getElementById('p-recommendations');
        recList.innerHTML = '';
        if (data.recommendations && data.recommendations.length > 0) {
            data.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.innerText = rec;
                recList.appendChild(li);
            });
        } else {
            recList.innerHTML = '<li>कोणत्याही विशिष्ट शिफारसी नाहीत.</li>';
        }
    }
};

// =========================================================================
// 5. PDF & WHATSAPP GENERATION (The Bulletproof Engine)
// =========================================================================
const PDFManager = {
    init() {
        const btnDownload = document.getElementById('btn-download-pdf');
        if (btnDownload) {
            btnDownload.addEventListener('click', () => this.downloadPDF());
        }

        const btnWhatsApp = document.getElementById('btn-share-whatsapp');
        if (btnWhatsApp) {
            btnWhatsApp.addEventListener('click', () => this.shareWhatsApp());
        }
    },

    async createPDFDocument() {
        const reportElement = document.getElementById('print-area');

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                scrollY: 0,
                windowWidth: 800,
                onclone: (clonedDoc) => {
                    const clonedReport = clonedDoc.getElementById('print-area');
                    if (clonedReport) {
                        clonedReport.style.background = 'white'; // White looks best for printing
                        
                        const innerContainer = clonedReport.querySelector('.report-preview-container');
                        if (innerContainer) {
                            // Force desktop width for PDF generation on mobile
                            innerContainer.style.width = '800px';
                            innerContainer.style.maxWidth = '800px';
                            innerContainer.style.margin = '0 auto';
                            innerContainer.style.padding = '3rem'; // Desktop padding
                        }
                        
                        // Use base64 logo to avoid CORS issues in canvas
                        const logoImg = clonedReport.querySelector('.report-header-logo');
                        if (logoImg && typeof LOGO_BASE64 !== 'undefined') {
                            logoImg.src = LOGO_BASE64;
                        }
                    }
                }
            });

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            return pdf;

        } catch (error) {
            console.error("PDF Generation Error:", error);
            throw error;
        }
    },

    async downloadPDF() {
        const btn = document.getElementById('btn-download-pdf');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
        btn.disabled = true;

        try {
            const pdf = await this.createPDFDocument();
            const reportData = Store.getCurrentPreview();
            const fileName = `${reportData.name.replace(/\s+/g, '_')}_Health_Report.pdf`;
            pdf.save(fileName);
            App.showToast('PDF Downloaded Successfully', 'success');
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("REAL PDF ERROR: " + (error.message || JSON.stringify(error)));
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    },

    async shareWhatsApp() {
        const reportData = Store.getCurrentPreview();
        if (!reportData) {
            App.showToast('No report data found', 'error');
            return;
        }

        const btn = document.getElementById('btn-share-whatsapp');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading Securely...';
        btn.disabled = true;

        // Open blank tab immediately to bypass browser pop-up blockers!
        const whatsappTab = window.open('', '_blank');
        if (whatsappTab) {
            whatsappTab.document.write('<h3 style="font-family:sans-serif; text-align:center; margin-top:20%; color:#0F3D2E;">Generating & Uploading your Report...<br><br>Please wait a few seconds.</h3>');
        }

        try {
            // 1. Generate PDF
            const pdf = await this.createPDFDocument();
            const pdfBlob = pdf.output('blob');
            const fileName = `${reportData.id || 'REP'}_${Date.now()}.pdf`;
            
            let publicUrl = null;

            // 2. ATTEMPT 1: SUPABASE UPLOAD (8 Second Timeout)
            try {
                if (window.supabaseClient) {
                    const uploadPromise = window.supabaseClient.storage.from('reports').upload(fileName, pdfBlob, { contentType: 'application/pdf' });
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Supabase Timeout")), 8000));
                    
                    const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

                    if (!error) {
                        const { data: urlData } = window.supabaseClient.storage.from('reports').getPublicUrl(fileName);
                        publicUrl = urlData.publicUrl;
                    } else {
                        throw error;
                    }
                }
            } catch (supaErr) {
                console.warn("Supabase upload failed, falling back to public CDN...", supaErr);
            }

            // 3. ATTEMPT 2: FALLBACK TO TMPFILES (8 Second Timeout)
            if (!publicUrl) {
                const formData = new FormData();
                formData.append('file', pdfBlob, fileName);
                
                const fetchPromise = fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: formData });
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("CDN Timeout")), 8000));
                
                const response = await Promise.race([fetchPromise, timeoutPromise]);
                if (response.ok) {
                    const result = await response.json();
                    publicUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                } else {
                    throw new Error("Both Upload Systems Failed. Check Network.");
                }
            }

            // 4. GENERATE TINYURL (4 Second Timeout)
            let finalUrl = publicUrl;
            try {
                const tinyPromise = fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(publicUrl)}`);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("TinyURL Timeout")), 4000));
                const tinyResponse = await Promise.race([tinyPromise, timeoutPromise]);
                if (tinyResponse.ok) {
                    finalUrl = await tinyResponse.text();
                }
            } catch (e) {
                console.warn("TinyURL failed", e);
            }

            // 5. REDIRECT TAB TO WHATSAPP
            const message = `नमस्कार ${reportData.name}\n\nआपण Siya Wellness Club च्या आरोग्य तपासणी शिबिरामध्ये सहभागी झाल्याबद्दल धन्यवाद.\n\nआपला वैयक्तिक आरोग्य अहवाल तयार झाला आहे.\n\n आरोग्य गुणांक : ${reportData.score}/100\n\nआपला संपूर्ण अहवाल पाहण्यासाठी खालील लिंकवर क्लिक करा.\n\n${finalUrl}\n\n निरोगी शरीर, आनंदी जीवन \n\nSiya Wellness Club`;
            const encodedMessage = encodeURIComponent(message);
            
            let mobile = reportData.mobile;
            if (mobile && mobile.length === 10) mobile = '91' + mobile;

            const whatsappUrl = `https://wa.me/${mobile}?text=${encodedMessage}`;
            
            if (whatsappTab) {
                whatsappTab.location.href = whatsappUrl;
            } else {
                // If popup blocker blocked the initial window.open, fallback to location.href
                window.location.href = whatsappUrl;
            }

        } catch (error) {
            if (whatsappTab) whatsappTab.close();
            console.error("WhatsApp Share Error:", error);
            alert("REAL UPLOAD ERROR: " + (error.message || JSON.stringify(error)));
            btn.innerHTML = `<span style="color:var(--danger); font-size:14px; font-weight:bold;">Error: Try Again</span>`;
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }, 5000);
            return;
        }

        // Restore button immediately if successful
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

// =========================================================================
// 6. MAIN APP INITIALIZER
// =========================================================================
const App = {
    init() {
        this.replaceLogo();
        this.initTheme();
        this.checkAuth();
        this.attachEventListeners();
        
        Auth.init();
        Form.init();
        PDFManager.init();
        CreditManager.init();
    },

    replaceLogo() {
        if (typeof LOGO_BASE64 !== 'undefined') {
            document.querySelectorAll('img').forEach(img => {
                if (img.getAttribute('src') === 'logo.jpg' || img.src.includes('logo.jpg')) {
                    img.src = LOGO_BASE64;
                }
            });
        }
    },

    attachEventListeners() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                Store.setTheme(newTheme);
                themeToggle.innerHTML = newTheme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
            });
        }
        
        const btnCreate = document.getElementById('btn-create-report');
        if (btnCreate) {
            btnCreate.addEventListener('click', () => {
                document.getElementById('health-form').reset();
                this.switchScreen('form-screen');
            });
        }

        const btnBackDash = document.getElementById('btn-back-dashboard');
        if (btnBackDash) {
            btnBackDash.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchScreen('dashboard-screen');
            });
        }
        
        const btnCancelForm = document.getElementById('btn-cancel-form');
        if (btnCancelForm) {
            btnCancelForm.addEventListener('click', () => this.switchScreen('dashboard-screen'));
        }

        const btnBackForm = document.getElementById('btn-back-form');
        if (btnBackForm) {
            btnBackForm.addEventListener('click', () => this.switchScreen('form-screen'));
        }
        
        const btnSaveDash = document.getElementById('btn-save-dashboard');
        if (btnSaveDash) {
            btnSaveDash.addEventListener('click', () => {
                Store.clearCurrentPreview();
                Dashboard.init();
                CreditManager.fetchCredits(); // Refresh credits
                this.switchScreen('dashboard-screen');
                this.showToast('Report saved successfully', 'success');
            });
        }
    },

    initTheme() {
        const theme = Store.getTheme();
        document.documentElement.setAttribute('data-theme', theme);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'light' ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        }
    },

    checkAuth() {
        if (Store.isLoggedIn()) {
            Dashboard.init();
            this.switchScreen('dashboard-screen');
        } else {
            this.switchScreen('login-screen');
        }
    },

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            const mainApp = document.getElementById('main-app');
            if (screenId !== 'login-screen' && screenId !== 'otp-screen') {
                mainApp.classList.add('active');
            } else {
                mainApp.classList.remove('active');
            }
            window.scrollTo(0, 0);
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        toast.innerHTML = `<i class="fas ${icon} toast-icon"></i><div>${message}</div>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        if (overlay) {
            if (loadingText) loadingText.innerText = text;
            overlay.classList.add('active');
        }
    },

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.remove('active');
    }
};

// Initialize App on Load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
