    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const FIREBASE_WEB_CONFIG = {
      apiKey: "AIzaSyCl46HDjqyh_v3JBOLb9B2oYFUlhAwRI34",
      authDomain: "homeflow-app-4d547.firebaseapp.com",
      projectId: "homeflow-app-4d547",
      storageBucket: "homeflow-app-4d547.firebasestorage.app",
      messagingSenderId: "514123198762",
      appId: "1:514123198762:web:f4614dd146dae1d714ae53"
    };

    const state = {
      currentUser: null,
      authMode: 'local',
      profile: createEmptyProfile(),
      currentPeriod: null,
      form: createEmptyPeriodData(),
      charts: {},
      investmentTotals: null,
      setupDraft: createEmptyProfile()
    };

    function createId(prefix = 'id') {
      return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
    }

    function slugify(value) {
      return String(value || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || createId('item');
    }

    function normalizeAdult(adult = {}) {
      const extra = [];
      if (Array.isArray(adult.extraIncomeLabels)) {
        adult.extraIncomeLabels.forEach(item => {
          const label = String(item?.label || '').trim();
          if (label) extra.push({ id: item.id || createId('income'), label });
        });
      } else if (adult.job2 || adult.secondIncome) {
        const label = String(adult.job2 || adult.secondIncome).trim();
        if (label) extra.push({ id: createId('income'), label });
      }
      return {
        id: adult.id || createId('adult'),
        name: String(adult.name || '').trim(),
        mainIncomeLabel: String(adult.mainIncomeLabel || adult.job1 || adult.mainIncome || 'Ingreso principal').trim() || 'Ingreso principal',
        extraIncomeLabels: extra
      };
    }

    function normalizeProfile(profile) {
      const base = createEmptyProfile();
      const merged = { ...base, ...(profile || {}) };
      merged.adults = (merged.adults || []).map(normalizeAdult).filter(adult => adult.name);
      merged.children = Array.isArray(merged.children) ? merged.children : [];
      merged.extraFixedExpenseLabels = Array.isArray(merged.extraFixedExpenseLabels) ? merged.extraFixedExpenseLabels : [];
      merged.fixedIncomePositions = Array.isArray(merged.fixedIncomePositions) ? merged.fixedIncomePositions : [];
      merged.investmentPositions = Array.isArray(merged.investmentPositions) ? merged.investmentPositions : [];
      merged.deposits = (Array.isArray(merged.deposits) ? merged.deposits : [])
        .map(item => HomeFlowCore.normalizeDepositLifecycle(item));
      merged.archivedAdults = (merged.archivedAdults || []).map(normalizeAdult).filter(adult => adult.name);
      merged.archivedChildren = Array.isArray(merged.archivedChildren) ? merged.archivedChildren : [];
      merged.fixedExpenseLabels = { ...base.fixedExpenseLabels, ...(merged.fixedExpenseLabels || {}) };
      merged.housing = { ...base.housing, ...(merged.housing || {}) };
      merged.housing.extraPayments = Array.isArray(merged.housing.extraPayments) ? merged.housing.extraPayments : [];
      merged.investmentTransfers = Array.isArray(merged.investmentTransfers) ? merged.investmentTransfers : [];
      merged.cashManualEntries = Array.isArray(merged.cashManualEntries) ? merged.cashManualEntries : [];
      merged.cashTrackingStartAt = merged.cashTrackingStartAt || null;
      merged.cashTrackingResetAt = merged.cashTrackingResetAt || null;
      merged.cashResetVersion = merged.cashResetVersion || null;
      merged.configured = !!(merged.configured && merged.adults.length);
      return merged;
    }

    function createEmptyProfile() {
      return {
        configured: false,
        adults: [],
        children: [],
        fixedExpenseLabels: {
          fibra: 'Fibra óptica',
          luz: 'Luz',
          gas: 'Gas',
          agua: 'Agua',
          viviendaAlquiler: 'Alquiler',
          viviendaHipoteca: 'Hipoteca',
          garaje: 'Garaje'
        },
        fixedIncomePositions: [],
        investmentPositions: [],
        investmentTransfers: [],
        deposits: [],
        cashManualEntries: [],
        cashTrackingStartAt: null,
        cashTrackingResetAt: null,
        cashResetVersion: null,
        extraFixedExpenseLabels: [],
        archivedAdults: [],
        archivedChildren: [],
        housing: {
          targetPrice: 1072000,
          entryPaid: 0,
          extraPayments: []
        },
        updatedAt: null
      };
    }

    function createEmptyPeriodData() {
      return {
        incomes: { adults: {} },
        expenses: {
          commonFixed: { fibra: 0, luz: 0, gas: 0, agua: 0, viviendaAlquiler: 0, viviendaHipoteca: 0, garaje: 0 },
          commonFixedExtra: {},
          supermarket: [],
          commonOther: [],
          adults: {},
          children: {},
          monthlyInvestments: []
        },
        meta: { updatedAt: null }
      };
    }

    function ensurePeriodStructure(data, profile) {
      const clean = structuredClone(data || createEmptyPeriodData());
      clean.incomes ||= { adults: {} };
      clean.incomes.adults ||= {};
      clean.expenses ||= {};
      clean.expenses.commonFixed ||= { fibra: 0, luz: 0, gas: 0, agua: 0, viviendaAlquiler: 0, viviendaHipoteca: 0, garaje: 0 };
      clean.expenses.commonFixedExtra ||= {};
      clean.expenses.supermarket ||= [];
      clean.expenses.commonOther ||= [];
      clean.expenses.monthlyInvestments ||= [];
      clean.expenses.adults ||= {};
      clean.expenses.children ||= {};
      clean.meta ||= { updatedAt: null };
      (profile.extraFixedExpenseLabels || []).forEach(item => {
        clean.expenses.commonFixedExtra[item.id] ||= 0;
      });
      (profile.adults || []).forEach(adult => {
        const adultMainLabel = adult.mainIncomeLabel || adult.job1 || adult.mainIncome || 'Ingreso principal';
        clean.incomes.adults[adult.id] ||= { mainFixed: 0, mainLabel: adultMainLabel, recurring: {}, other: [] };
        clean.incomes.adults[adult.id].mainLabel ||= adultMainLabel;
        clean.incomes.adults[adult.id].recurring ||= {};
        (adult.extraIncomeLabels || []).forEach(item => {
          clean.incomes.adults[adult.id].recurring[item.id] ||= { label: item.label, amount: 0 };
          clean.incomes.adults[adult.id].recurring[item.id].label ||= item.label;
        });
        clean.expenses.adults[adult.id] ||= [];
      });
      (profile.children || []).forEach(child => {
        clean.expenses.children[child.id] ||= [];
      });
      return clean;
    }

    function getActiveAdults(profile = state.profile) {
      return Array.isArray(profile?.adults) ? profile.adults : [];
    }

    function getArchivedAdults(profile = state.profile) {
      return Array.isArray(profile?.archivedAdults) ? profile.archivedAdults : [];
    }

    function getAllAdults(profile = state.profile) {
      return [...getActiveAdults(profile), ...getArchivedAdults(profile)];
    }

    function getActiveChildren(profile = state.profile) {
      return Array.isArray(profile?.children) ? profile.children : [];
    }

    function getArchivedChildren(profile = state.profile) {
      return Array.isArray(profile?.archivedChildren) ? profile.archivedChildren : [];
    }

    function getAllChildren(profile = state.profile) {
      return [...getActiveChildren(profile), ...getArchivedChildren(profile)];
    }

    function buildProfileSnapshot(profile = state.profile) {
      return {
        adults: getAllAdults(profile).map(adult => ({
          id: adult.id,
          name: adult.name,
          mainIncomeLabel: adult.mainIncomeLabel || 'Ingreso principal',
          extraIncomeLabels: structuredClone(adult.extraIncomeLabels || [])
        })),
        children: getAllChildren(profile).map(child => ({
          id: child.id,
          name: child.name,
          note: child.note || ''
        })),
        fixedExpenseLabels: structuredClone(profile?.fixedExpenseLabels || createEmptyProfile().fixedExpenseLabels),
        extraFixedExpenseLabels: structuredClone(profile?.extraFixedExpenseLabels || [])
      };
    }

    function getProfileContextForData(data, fallbackProfile = state.profile) {
      const snapshot = data?.meta?.profileSnapshot;
      if (!snapshot) {
        return {
          adults: getAllAdults(fallbackProfile),
          children: getAllChildren(fallbackProfile),
          fixedExpenseLabels: fallbackProfile.fixedExpenseLabels || createEmptyProfile().fixedExpenseLabels,
          extraFixedExpenseLabels: fallbackProfile.extraFixedExpenseLabels || []
        };
      }
      return {
        adults: (snapshot.adults || []).map(normalizeAdult),
        children: Array.isArray(snapshot.children) ? snapshot.children : [],
        fixedExpenseLabels: { ...createEmptyProfile().fixedExpenseLabels, ...(snapshot.fixedExpenseLabels || {}) },
        extraFixedExpenseLabels: Array.isArray(snapshot.extraFixedExpenseLabels) ? snapshot.extraFixedExpenseLabels : []
      };
    }
    function getLoadedFormContext() {
      return getProfileContextForData(state.form, state.profile);
    }

    function getLoadedAdults() {
      return getLoadedFormContext().adults || [];
    }

    function getLoadedChildren() {
      return getLoadedFormContext().children || [];
    }

    function isArchivedMember(memberId, type = 'adult') {
      if (!memberId) return false;
      if (type === 'child') return !getActiveChildren().some(item => item.id === memberId);
      return !getActiveAdults().some(item => item.id === memberId);
    }



    const authAdapter = {
      firebaseReady: false,
      init() {
        try {
          if (FIREBASE_WEB_CONFIG && FIREBASE_WEB_CONFIG.apiKey) {
            firebase.initializeApp(FIREBASE_WEB_CONFIG);
            this.firebaseReady = true;
            state.authMode = 'firebase';
                        firebase.auth().onAuthStateChanged(async (user) => {
              if (user) {
                await onUserAuthenticated({ uid: user.uid, email: user.email });
              } else {
                onUserSignedOut();
              }
            });
          } else {
                        const session = JSON.parse(localStorage.getItem('homeflow_local_session') || 'null');
            if (session?.email) onUserAuthenticated({ uid: session.email, email: session.email });
          }
        } catch (error) {
          console.error(error);
          document.getElementById('auth-status').textContent = 'No se pudo iniciar el acceso.';
        }
      },
      async register(email, password) {
        if (this.firebaseReady) {
          return firebase.auth().createUserWithEmailAndPassword(email, password);
        }
        const users = JSON.parse(localStorage.getItem('homeflow_local_users') || '{}');
        if (users[email]) throw new Error('Ese correo ya existe en modo local.');
        users[email] = { password };
        localStorage.setItem('homeflow_local_users', JSON.stringify(users));
        localStorage.setItem('homeflow_local_session', JSON.stringify({ email }));
        return { user: { uid: email, email } };
      },
      async login(email, password) {
        if (this.firebaseReady) {
          return firebase.auth().signInWithEmailAndPassword(email, password);
        }
        const users = JSON.parse(localStorage.getItem('homeflow_local_users') || '{}');
        if (!users[email] || users[email].password !== password) throw new Error('Correo o contraseña incorrectos en modo local.');
        localStorage.setItem('homeflow_local_session', JSON.stringify({ email }));
        return { user: { uid: email, email } };
      },
      async logout() {
        if (this.firebaseReady) return firebase.auth().signOut();
        localStorage.removeItem('homeflow_local_session');
        onUserSignedOut();
      },
      async resetPassword(email) {
        if (this.firebaseReady) {
          return firebase.auth().sendPasswordResetEmail(email);
        }
        throw new Error('El reseteo por correo solo funciona con Firebase activo.');
      }
    };

    const storageAdapter = {
      getLocalBundleKey(userId) {
        return `homeflow_bundle_${userId}`;
      },
      readLegacyLocalBundle(userId) {
        if (!userId) return null;
        try {
          return JSON.parse(localStorage.getItem(this.getLocalBundleKey(userId)) || 'null');
        } catch (error) {
          console.error('No se pudo leer la copia local heredada.', error);
          return null;
        }
      },
      async getRemoteDocRef(userId) {
        if (!authAdapter.firebaseReady) throw new Error('Firebase no está activo.');
        return firebase.firestore().collection('familias').doc(userId);
      },
      async migrateLegacyLocalBundleIfNeeded(userId, remoteBundle) {
        if (!authAdapter.firebaseReady || !userId || remoteBundle) return remoteBundle;
        const legacy = this.readLegacyLocalBundle(userId);
        if (!legacy) return remoteBundle;
        const normalizedLegacy = {
          profile: normalizeProfile(legacy.profile || createEmptyProfile()),
          periods: legacy.periods || {},
          deposits: legacy.deposits || (legacy.profile?.deposits || [])
        };
        const ref = await this.getRemoteDocRef(userId);
        await ref.set(normalizedLegacy, { merge: true });
        try {
          localStorage.removeItem(this.getLocalBundleKey(userId));
        } catch (error) {
          console.warn('No se pudo limpiar la copia local heredada tras migrarla.', error);
        }
        return normalizedLegacy;
      },
      async getUserBundle(userId) {
        if (!userId) return null;
        if (!authAdapter.firebaseReady) {
          return this.readLegacyLocalBundle(userId);
        }
        try {
          const ref = await this.getRemoteDocRef(userId);
          const doc = await ref.get();
          const remote = doc.exists ? doc.data() : null;
          return await this.migrateLegacyLocalBundleIfNeeded(userId, remote);
        } catch (error) {
          console.error('Fallo leyendo en Firebase.', error);
          throw new Error('No se pudieron cargar tus datos.');
        }
      },
      async saveUserBundle(userId, bundle) {
        if (!userId) return;
        if (!authAdapter.firebaseReady) {
          throw new Error('Esta versión requiere Firebase para guardar los datos.');
        }
        try {
          const ref = await this.getRemoteDocRef(userId);
          await ref.set(structuredClone(bundle), { merge: true });
        } catch (error) {
          console.error('Fallo guardando en Firebase.', error);
          throw new Error('No se pudo guardar. Inténtalo otra vez.');
        }
      },
      async wipeUserBundle(userId) {
        if (!userId) return;
        try {
          localStorage.removeItem(this.getLocalBundleKey(userId));
        } catch (error) {
          console.warn('No se pudo borrar la copia local heredada.', error);
        }
        if (authAdapter.firebaseReady) {
          try {
            const ref = await this.getRemoteDocRef(userId);
            await ref.delete();
          } catch (error) {
            console.error('Fallo borrando en Firebase.', error);
            throw new Error('No se pudieron borrar los datos.');
          }
          return;
        }
      },
      async saveProfile(profile) {
        const bundle = await this.getSafeBundle();
        bundle.profile = structuredClone(profile);
        await this.saveUserBundle(state.currentUser.uid, bundle);
      },
      async getProfile() {
        const bundle = await this.getSafeBundle();
        return bundle.profile || createEmptyProfile();
      },
      async getAllPeriods() {
        const bundle = await this.getSafeBundle();
        return bundle.periods || {};
      },
      async savePeriod(periodId, data) {
        const bundle = await this.getSafeBundle();
        bundle.periods = HomeFlowCore.upsertPeriodMap(
          bundle.periods,
          periodId,
          structuredClone(data)
        );
        await this.saveUserBundle(state.currentUser.uid, bundle);
      },
      async getPeriod(periodId) {
        const all = await this.getAllPeriods();
        return all[periodId] || null;
      },
      async saveDeposits(deposits) {
        const bundle = await this.getSafeBundle();
        bundle.deposits = structuredClone(deposits || []);
        await this.saveUserBundle(state.currentUser.uid, bundle);
      },
      async getDeposits() {
        const bundle = await this.getSafeBundle();
        return bundle.deposits || [];
      },
      async getSafeBundle() {
        const existing = await this.getUserBundle(state.currentUser?.uid);
        return existing || { profile: createEmptyProfile(), periods: {}, deposits: [] };
      }
    };

    function currentDeposits() {
      if (!state.profile.deposits) state.profile.deposits = [];
      state.profile.deposits = state.profile.deposits.map(item => HomeFlowCore.normalizeDepositLifecycle(item));
      return state.profile.deposits;
    }

    function isDepositActive(deposit) {
      return HomeFlowCore.isDepositActive(deposit);
    }

    function isDepositClosed(deposit) {
      return HomeFlowCore.isDepositClosed(deposit);
    }

    function currentInvestmentPositions() {
      if (!Array.isArray(state.profile.investmentPositions)) {
        state.profile.investmentPositions = (state.profile.fixedIncomePositions || []).map(item => ({
          id: item.id || createId('inv'),
          name: item.name,
          type: item.type || 'Renta fija',
          owner: item.owner || 'Hogar',
          platform: item.entity || '',
          amount: num(item.amount)
        }));
      }
      return state.profile.investmentPositions;
    }

    function currentInvestmentTransfers() {
      if (!Array.isArray(state.profile.investmentTransfers)) state.profile.investmentTransfers = [];
      return state.profile.investmentTransfers;
    }

    function currentHistoricalInvestmentPositions() {
      if (!Array.isArray(state.profile.investmentPositions)) state.profile.investmentPositions = [];
      return state.profile.investmentPositions;
    }

    function getFundMonthlyInvestments(list = []) {
      return (list || []).filter(item => getInvestmentCategory(item?.type) === 'funds');
    }


    async function getAggregatedMonthlyInvestments() {
      const all = await storageAdapter.getAllPeriods();
      const currentId = state.currentPeriod || getSelectedPeriodId();
      const rows = [];
      let total = 0;
      Object.entries(all || {}).forEach(([periodId, periodData]) => {
        if (periodId === currentId) return;
        (periodData?.expenses?.monthlyInvestments || []).forEach(item => {
          rows.push({ period: periodId, ...item });
          total += num(item.amount);
        });
      });
      (state.form?.expenses?.monthlyInvestments || []).forEach(item => {
        rows.push({ period: currentId, ...item });
        total += num(item.amount);
      });
      return { rows, total };
    }
    function populatePeriodSelectors() {
      const monthSelect = document.getElementById('period-month');
      monthSelect.innerHTML = '';
      monthNames.forEach((name, index) => {
        const option = document.createElement('option');
        option.value = String(index + 1).padStart(2, '0');
        option.textContent = name;
        monthSelect.appendChild(option);
      });
      document.getElementById('period-year').value = new Date().getFullYear();
      monthSelect.value = String(new Date().getMonth() + 1).padStart(2, '0');
    }

    function bindTabs() {
      document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          activateTab(btn.dataset.tab);
        });
      });
    }

    function bindAccordionBehavior(root = document) {
      const isMobile = window.matchMedia('(max-width: 720px)').matches;
      root.querySelectorAll('details.workspace-accordion').forEach(details => {
        if (details.dataset.accordionBound) return;
        details.dataset.accordionBound = 'true';
        if (isMobile && details.hasAttribute('data-mobile-collapsed')) details.open = false;
        details.addEventListener('toggle', () => {
          if (!details.open) return;
          if (isMobile && details.hasAttribute('data-scroll-on-open')) {
            window.setTimeout(() => {
              const headerBottom = document.querySelector('.hero')?.getBoundingClientRect().bottom || 0;
              const detailsTop = details.getBoundingClientRect().top;
              const targetTop = Math.max(0, window.scrollY + detailsTop - headerBottom - 8);
              window.scrollTo({ top: targetTop, behavior: 'smooth' });
            }, 80);
          }
          window.requestAnimationFrame(() => {
            Object.values(state.charts || {}).forEach(chart => chart?.resize?.());
          });
        });
      });
    }

    function setAuthPanelExpanded(expanded) {
      const card = document.getElementById('auth-card');
      const toggle = document.getElementById('auth-toggle');
      if (!card || !toggle) return;
      card.classList.toggle('hidden', !expanded);
      toggle.setAttribute('aria-expanded', String(expanded));
      toggle.classList.toggle('authenticated', !!state.currentUser);
      const label = toggle.querySelector('.header-action-label');
      if (label) label.textContent = state.currentUser ? 'Cuenta' : 'Acceso';
    }

    function applyTheme(theme) {
      const isDark = theme !== 'light';
      document.body.classList.toggle('dark', isDark);
      const toggle = document.getElementById('theme-toggle');
      if (!toggle) return;
      const icon = toggle.querySelector('.theme-icon');
      const label = toggle.querySelector('.theme-label');
      if (icon) icon.textContent = isDark ? '☀️' : '🌙';
      if (label) label.textContent = isDark ? 'Claro' : 'Oscuro';
    }

    function initTheme() {
      applyTheme(localStorage.getItem('homeflow-theme') || 'dark');
      document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const next = document.body.classList.contains('dark') ? 'light' : 'dark';
        localStorage.setItem('homeflow-theme', next);
        applyTheme(next);
      });
    }

    function bindActions() {
      document.getElementById('auth-toggle').addEventListener('click', () => {
        const card = document.getElementById('auth-card');
        setAuthPanelExpanded(card.classList.contains('hidden'));
      });
      document.getElementById('btn-login').addEventListener('click', handleLogin);
      document.getElementById('btn-register').addEventListener('click', handleRegister);
      document.getElementById('btn-reset-password').addEventListener('click', handleResetPassword);
      document.getElementById('btn-logout').addEventListener('click', () => authAdapter.logout());
      document.getElementById('btn-open-setup').addEventListener('click', openSetupModalFromProfile);
      document.getElementById('go-config').addEventListener('click', () => document.querySelector('[data-tab="configuracion"]').click());
      document.getElementById('load-period').addEventListener('click', loadSelectedPeriod);
      document.getElementById('save-period').addEventListener('click', saveCurrentPeriod);
      document.getElementById('calculate-compound').addEventListener('click', calculateCompound);
      document.getElementById('export-history').addEventListener('click', exportHistoryExcel);
      document.getElementById('export-pdf').addEventListener('click', exportHistoryPDF);
      document.getElementById('add-deposit').addEventListener('click', addDeposit);
      document.getElementById('add-historical-investment')?.addEventListener('click', addHistoricalInvestment);
      document.getElementById('save-housing-settings')?.addEventListener('click', saveHousingSettings);
      document.getElementById('add-housing-extra')?.addEventListener('click', addHousingExtraPayment);
      document.getElementById('add-extra-fixed-expense').addEventListener('click', addExtraFixedExpenseFromConfig);
      document.getElementById('add-adult').addEventListener('click', addAdultFromConfig);
      document.getElementById('add-adult-extra-income').addEventListener('click', addAdultExtraIncomeFromConfig);
      document.getElementById('add-child').addEventListener('click', addChildFromConfig);
      document.getElementById('save-profile').addEventListener('click', saveProfileFromConfiguration);
      document.getElementById('reopen-setup').addEventListener('click', openSetupModalFromProfile);
      document.getElementById('wipe-user-data').addEventListener('click', wipeUserData);
      document.getElementById('setup-add-adult').addEventListener('click', addAdultToSetupDraft);
      document.getElementById('setup-add-adult-extra-income').addEventListener('click', addAdultExtraIncomeToSetupDraft);
      document.getElementById('setup-add-child').addEventListener('click', addChildToSetupDraft);
      document.getElementById('setup-save-profile').addEventListener('click', saveSetupDraft);
      document.getElementById('close-setup-modal').addEventListener('click', closeSetupModal);
      document.querySelectorAll('.compound-preset').forEach(button => {
        button.addEventListener('click', () => {
          document.getElementById('compound-rate').value = button.dataset.compoundRate;
          document.querySelectorAll('.compound-preset').forEach(item => item.classList.toggle('active', item === button));
          calculateCompound();
        });
      });
      ['compound-initial', 'compound-monthly', 'compound-rate', 'compound-inflation', 'compound-years', 'compound-target'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', calculateCompound);
      });
    }

    async function handleRegister() {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      if (!email || password.length < 6) return setAuthStatus('Introduce un correo y una contraseña de al menos 6 caracteres.', true);
      try {
        const result = await authAdapter.register(email, password);
          if (!authAdapter.firebaseReady) await onUserAuthenticated({ uid: result.user.uid, email: result.user.email });
      } catch (error) {
        setAuthStatus(error.message || 'No se pudo crear la cuenta.', true);
      }
    }

    async function handleLogin() {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      if (!email || !password) return setAuthStatus('Introduce correo y contraseña.', true);
      try {
        const result = await authAdapter.login(email, password);
          if (!authAdapter.firebaseReady) await onUserAuthenticated({ uid: result.user.uid, email: result.user.email });
      } catch (error) {
        setAuthStatus(error.message || 'No se pudo iniciar sesión.', true);
      }
    }

    async function handleResetPassword() {
      const email = document.getElementById('auth-email').value.trim();
      if (!email) return setAuthStatus('Escribe el correo primero.', true);
      try {
        await authAdapter.resetPassword(email);
        setAuthStatus('Se ha enviado el correo de restablecimiento.');
      } catch (error) {
        setAuthStatus(error.message || 'No se pudo restablecer la contraseña.', true);
      }
    }

    async function onUserAuthenticated(user) {
      try {
        state.currentUser = user;
        document.getElementById('auth-logged-out').classList.add('hidden');
        document.getElementById('auth-logged-in').classList.remove('hidden');
        setAuthPanelExpanded(false);
        document.getElementById('app-content').classList.remove('hidden');
        document.getElementById('current-user-label').textContent = `Usuario conectado: ${user.email}`;
        state.profile = normalizeProfile(await storageAdapter.getProfile());
        const separatelyStoredDeposits = await storageAdapter.getDeposits();
        const depositsById = new Map();
        [...(separatelyStoredDeposits || []), ...(state.profile.deposits || [])].forEach((deposit) => {
          const key = deposit?.id || `${deposit?.name || 'deposit'}_${deposit?.start || ''}_${deposit?.amount || 0}`;
          depositsById.set(key, HomeFlowCore.normalizeDepositLifecycle(deposit));
        });
        state.profile.deposits = Array.from(depositsById.values());
        if (!Array.isArray(state.profile.fixedIncomePositions)) state.profile.fixedIncomePositions = [];
        if (!Array.isArray(state.profile.investmentPositions)) {
          state.profile.investmentPositions = (state.profile.fixedIncomePositions || []).map(item => ({ id: item.id || createId('inv'), name: item.name, type: item.type || 'Renta fija', owner: item.owner || 'Hogar', platform: item.entity || '', amount: num(item.amount) }));
        }
        renderProfileStatus();
        renderProfileConfig();
        populatePeriodSelectors();
        await loadTodayPeriod();
        calculateCompound();
        await renderInvestmentsTab();
        await refreshHistoricalView();
        if (!isProfileReady()) {
          state.setupDraft = structuredClone(state.profile);
          openSetupModal();
        }
      } catch (error) {
        console.error(error);
        setAuthStatus(error?.message || 'No se pudieron cargar los datos del usuario.', true);
      }
    }

    function onUserSignedOut() {
      state.currentUser = null;
      state.profile = createEmptyProfile();
      state.form = createEmptyPeriodData();
      state.investmentTotals = null;
      document.getElementById('auth-logged-out').classList.remove('hidden');
      document.getElementById('auth-logged-in').classList.add('hidden');
      setAuthPanelExpanded(true);
      document.getElementById('app-content').classList.add('hidden');
      setAuthStatus('');
      closeSetupModal();
    }

    function isProfileReady(profile = state.profile) {
      return !!(profile && profile.configured && Array.isArray(profile.adults) && profile.adults.length > 0);
    }

    function syncProfileReadyUI() {
      const ready = isProfileReady();
      document.getElementById('app-content')?.classList.toggle('hidden', !state.currentUser);
      document.getElementById('setup-warning')?.classList.toggle('hidden', ready);
      const setupBtn = document.getElementById('btn-open-setup');
      if (setupBtn) setupBtn.textContent = ready ? 'Editar familia' : 'Configurar familia';
    }

    function currentLoadedPeriodIsHistorical() {
      const snapshot = state.form?.meta?.profileSnapshot;
      if (!snapshot) return false;
      const activeAdultIds = new Set(getActiveAdults().map(item => item.id));
      const activeChildIds = new Set(getActiveChildren().map(item => item.id));
      const snapshotAdultIds = new Set((snapshot.adults || []).map(item => item.id));
      const snapshotChildIds = new Set((snapshot.children || []).map(item => item.id));
      if (snapshotAdultIds.size !== activeAdultIds.size || snapshotChildIds.size !== activeChildIds.size) return true;
      for (const id of snapshotAdultIds) if (!activeAdultIds.has(id)) return true;
      for (const id of snapshotChildIds) if (!activeChildIds.has(id)) return true;
      const currentExtras = JSON.stringify((state.profile.extraFixedExpenseLabels || []).map(item => item.id).sort());
      const snapshotExtras = JSON.stringify((snapshot.extraFixedExpenseLabels || []).map(item => item.id).sort());
      return currentExtras !== snapshotExtras;
    }

    function renderPeriodContextNote() {
      const note = document.getElementById('period-context-note');
      if (!note) return;
      const currentId = state.currentPeriod || getSelectedPeriodId();
      if (!currentId) {
        note.classList.add('hidden');
        note.textContent = '';
        return;
      }
      if (currentLoadedPeriodIsHistorical()) {
        note.classList.remove('hidden');
        note.textContent = `Estás viendo ${formatPeriod(currentId)} con su estructura histórica. Los miembros o gastos archivados siguen visibles solo para ese mes.`;
      } else {
        note.classList.add('hidden');
        note.textContent = '';
      }
    }

    function renderProfileStatus() {
      const badge = document.getElementById('profile-status-badge');
      const ready = isProfileReady();
      badge.textContent = ready ? 'Perfil configurado' : 'Perfil pendiente';
      badge.className = `badge ${ready ? 'good' : 'warn'}`;
      syncProfileReadyUI();
    }

    function setAuthStatus(message, isError = false) {
      const el = document.getElementById('auth-status');
      el.style.color = isError ? 'var(--bad)' : 'var(--good)';
      el.textContent = message;
    }

    let saveStatusTimer = null;
    let saveButtonTimer = null;

    function setStatus(message, isError = false, persist = false) {
      const el = document.getElementById('save-status');
      if (!el) return;
      el.className = `status ${message ? (isError ? 'error-banner' : 'success-banner') : ''}`.trim();
      el.textContent = message;
      if (saveStatusTimer) clearTimeout(saveStatusTimer);
      if (message && !isError && !persist) {
        saveStatusTimer = setTimeout(() => {
          el.textContent = '';
          el.className = 'status';
        }, 3500);
      }
    }

    function flashSaveButtonSuccess() {
      const btn = document.getElementById('save-period');
      if (!btn) return;
      const originalText = btn.dataset.originalText || btn.textContent;
      btn.dataset.originalText = originalText;
      btn.textContent = 'Guardado ✓';
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      if (saveButtonTimer) clearTimeout(saveButtonTimer);
      saveButtonTimer = setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }, 2200);
    }

    function getSelectedPeriodId() {
      return `${document.getElementById('period-year').value}-${document.getElementById('period-month').value}`;
    }

    async function loadTodayPeriod() {
      state.currentPeriod = getSelectedPeriodId();
      await loadSelectedPeriod();
    }

    async function loadSelectedPeriod() {
      if (!state.currentUser) return;
      state.currentPeriod = getSelectedPeriodId();
      const data = await storageAdapter.getPeriod(state.currentPeriod);
      state.form = ensurePeriodStructure(data || createEmptyPeriodData(), state.profile);
      state.form.meta ||= {};
      state.form.meta.profileSnapshot ||= buildProfileSnapshot(state.profile);
      renderMonthlyArea();
      renderMonthlySummary();
      renderPeriodContextNote();
      setStatus('');
    }

    async function saveCurrentPeriod() {
      if (!state.currentUser) return setStatus('Debes iniciar sesión antes de guardar.', true);
      if (!isProfileReady()) return setStatus('Configura primero tu familia.', true);
      const selectedPeriod = getSelectedPeriodId();
      if (state.currentPeriod && selectedPeriod !== state.currentPeriod) {
        return setStatus(`Has cambiado el selector a ${formatPeriod(selectedPeriod)}. Pulsa “Cargar período” antes de guardar para no copiar datos de otro mes.`, true, true);
      }
      state.currentPeriod ||= selectedPeriod;
      const saveButton = document.getElementById('save-period');
      if (saveButton?.disabled) return;
      try {
        if (saveButton) saveButton.disabled = true;
        const periodAlreadyExists = !!(await storageAdapter.getPeriod(state.currentPeriod));
        state.form.meta.updatedAt = new Date().toISOString();
        state.form.meta.profileSnapshot = buildProfileSnapshot(state.profile);
        await storageAdapter.savePeriod(state.currentPeriod, structuredClone(state.form));
        renderPeriodContextNote();
        setStatus(periodAlreadyExists
          ? `✅ ${formatPeriod(state.currentPeriod)} actualizado. El mes anterior se ha reemplazado, no se ha duplicado.`
          : `✅ ${formatPeriod(state.currentPeriod)} guardado correctamente.`);
        flashSaveButtonSuccess();
        await refreshHistoricalView();
      } catch (error) {
        console.error(error);
        setStatus(error?.message || 'No se pudo guardar el período.', true);
      } finally {
        if (saveButton) saveButton.disabled = false;
      }
    }

    function renderMonthlyArea() {
      const area = document.getElementById('monthly-dynamic-area');
      if (!isProfileReady()) {
        area.innerHTML = '<div class="card"><div class="empty-box">Configura la familia en la pestaña Configuración para poder cargar ingresos, gastos e inversiones.</div></div>';
        return;
      }

      const loadedContext = getLoadedFormContext();
      const fixedLabels = loadedContext.fixedExpenseLabels || state.profile.fixedExpenseLabels;
      area.innerHTML = `
        <div class="accordion-stack">
          <details class="workspace-accordion monthly-common-card" data-mobile-collapsed>
            <summary><span><strong>Gastos comunes</strong><small>Vivienda, suministros, supermercado y otros</small></span></summary>
            <div class="accordion-body">
            <div class="field-row">
              <div><label>${escapeHtml(fixedLabels.fibra)}</label><input type="number" min="0" step="0.01" data-path="expenses.commonFixed.fibra" value="${num(state.form.expenses.commonFixed.fibra)}" /></div>
              <div><label>${escapeHtml(fixedLabels.luz)}</label><input type="number" min="0" step="0.01" data-path="expenses.commonFixed.luz" value="${num(state.form.expenses.commonFixed.luz)}" /></div>
              <div><label>${escapeHtml(fixedLabels.gas)}</label><input type="number" min="0" step="0.01" data-path="expenses.commonFixed.gas" value="${num(state.form.expenses.commonFixed.gas)}" /></div>
              <div><label>${escapeHtml(fixedLabels.agua)}</label><input type="number" min="0" step="0.01" data-path="expenses.commonFixed.agua" value="${num(state.form.expenses.commonFixed.agua)}" /></div>
              <div><label>${escapeHtml(fixedLabels.viviendaAlquiler || 'Alquiler')}</label><input type="number" min="0" step="0.01" data-path="expenses.commonFixed.viviendaAlquiler" value="${num(state.form.expenses.commonFixed.viviendaAlquiler)}" /></div>
              <div><label>${escapeHtml(fixedLabels.viviendaHipoteca || 'Hipoteca')}</label><input type="number" min="0" step="0.01" data-path="expenses.commonFixed.viviendaHipoteca" value="${num(state.form.expenses.commonFixed.viviendaHipoteca)}" /></div>
              <div><label>${escapeHtml(fixedLabels.garaje)}</label><input type="number" min="0" step="0.01" data-path="expenses.commonFixed.garaje" value="${num(state.form.expenses.commonFixed.garaje)}" /></div>
            </div>
            ${(loadedContext.extraFixedExpenseLabels || []).length ? `
              <div class="category-card" style="margin-top:16px;">
                <div class="section-title"><h3>Gastos fijos comunes extra</h3></div>
                <div class="field-row">
                  ${(loadedContext.extraFixedExpenseLabels || []).map(item => `
                    <div>
                      <label>${escapeHtml(item.label)}</label>
                      <input type="number" min="0" step="0.01" data-path="expenses.commonFixedExtra.${item.id}" value="${num(state.form.expenses.commonFixedExtra[item.id] || 0)}" />
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            <div class="category-card" style="margin-top:16px;">
              <div class="section-title"><h3>Compras supermercado</h3><span class="muted">Añade cada compra</span></div>
              <div class="field-row-3">
                <div><label>Concepto / tienda</label><input type="text" id="supermarket-name" placeholder="Ej. Mercadona" /></div>
                <div><label>Importe</label><input type="number" min="0" step="0.01" id="supermarket-amount" /></div>
                <button class="btn btn-soft" data-add-dynamic="expenses.supermarket">Añadir</button>
              </div>
              <div id="list-supermarket" class="dynamic-list"></div>
            </div>
            <div class="category-card" style="margin-top:16px;">
              <div class="section-title"><h3>Otros gastos comunes</h3></div>
              <div class="field-row-3">
                <div><label>Concepto</label><input type="text" id="common-name" placeholder="Ej. Seguro hogar" /></div>
                <div><label>Importe</label><input type="number" min="0" step="0.01" id="common-amount" /></div>
                <button class="btn btn-soft" data-add-dynamic="expenses.commonOther">Añadir</button>
              </div>
              <div id="list-commonOther" class="dynamic-list"></div>
            </div>
            </div>
          </details>

          <details class="workspace-accordion monthly-invest-card" data-mobile-collapsed>
            <summary><span><strong>Inversiones comunes</strong><small>Aportaciones del hogar por tipo y titular</small></span></summary>
            <div class="accordion-body">
            <div class="category-card">
              <div class="section-title"><h3>Aportaciones mensuales</h3><span class="muted">La renta variable y la renta fija alimentan su categoría correspondiente</span></div>
              <div class="field-row-4">
                <div><label>Concepto</label><input id="invest-name" type="text" placeholder="Ej. Fondo índice / ETF" /></div>
                <div><label>Tipo</label><select id="invest-type"><option value="Renta variable">Renta variable</option><option value="Renta fija">Renta fija</option></select></div>
                <div><label>Titular</label><select id="invest-owner"><option value="Hogar">Hogar</option>${getLoadedAdults().map(a => `<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)}${isArchivedMember(a.id, 'adult') ? ' (histórico)' : ''}</option>`).join('')}</select></div>
                <div><label>Importe</label><input id="invest-amount" type="number" min="0" step="0.01" /></div>
                <button class="btn btn-soft" data-add-dynamic="expenses.monthlyInvestments">Añadir</button>
              </div>
              <div id="list-monthlyInvestments" class="dynamic-list"></div>
            </div>
            <div class="category-card" style="margin-top:16px;">
              <div class="section-title"><h3>Inversiones acumuladas del hogar</h3><span class="muted">Se calculan automáticamente con lo ya guardado</span></div>
              <div class="empty-box">Aquí ya no tienes que añadir posiciones acumuladas. HomeFlow suma automáticamente las aportaciones mensuales guardadas en su categoría y los depósitos activos en la pestaña Inversiones.</div>
            </div>
            </div>
          </details>
        </div>

        <div class="accordion-stack" style="margin-top:14px;" id="person-cards-row"></div>
      `;

      bindMonthlyFieldInputs();
      bindDynamicMonthlyButtons();
      renderCommonLists();
      renderPersonCards();
      bindAccordionBehavior(area);
    }

    function bindMonthlyFieldInputs() {
      document.querySelectorAll('[data-path]').forEach(input => {
        input.addEventListener('input', () => {
          setValueByStringPath(state.form, input.dataset.path, parseFloat(input.value || 0) || 0);
          renderMonthlySummary();
        });
      });
    }

    function bindDynamicMonthlyButtons() {
      document.querySelectorAll('[data-add-dynamic]').forEach(btn => {
        btn.addEventListener('click', () => addDynamicMonthlyItem(btn.dataset.addDynamic));
      });
    }

    function addDynamicMonthlyItem(target) {
      if (target === 'expenses.supermarket') {
        const name = document.getElementById('supermarket-name').value.trim();
        const amount = parseFloat(document.getElementById('supermarket-amount').value || 0);
        if (!name || !amount) return;
        state.form.expenses.supermarket.push({ name, amount });
        document.getElementById('supermarket-name').value = '';
        document.getElementById('supermarket-amount').value = '';
        renderCommonLists();
        renderMonthlySummary();
        return;
      }
      if (target === 'expenses.commonOther') {
        const name = document.getElementById('common-name').value.trim();
        const amount = parseFloat(document.getElementById('common-amount').value || 0);
        if (!name || !amount) return;
        state.form.expenses.commonOther.push({ name, amount });
        document.getElementById('common-name').value = '';
        document.getElementById('common-amount').value = '';
        renderCommonLists();
        renderMonthlySummary();
        return;
      }
      if (target === 'expenses.monthlyInvestments') {
        const name = document.getElementById('invest-name').value.trim();
        const type = document.getElementById('invest-type').value;
        const owner = document.getElementById('invest-owner').value;
        const amount = parseFloat(document.getElementById('invest-amount').value || 0);
        if (!name || !amount) return;
        state.form.expenses.monthlyInvestments.push({ name, type, owner, amount });
        document.getElementById('invest-name').value = '';
        document.getElementById('invest-amount').value = '';
        renderCommonLists();
        renderMonthlySummary();
        renderInvestmentsTab();
      }
    }

    function renderCommonLists() {
      renderSimpleDynamicList('list-supermarket', state.form.expenses.supermarket, item => item.name, index => {
        state.form.expenses.supermarket.splice(index, 1);
        renderCommonLists();
        renderMonthlySummary();
      });
      renderSimpleDynamicList('list-commonOther', state.form.expenses.commonOther, item => item.name, index => {
        state.form.expenses.commonOther.splice(index, 1);
        renderCommonLists();
        renderMonthlySummary();
      });
      renderSimpleDynamicList('list-monthlyInvestments', state.form.expenses.monthlyInvestments, item => `${item.type} · ${item.owner} · ${item.name}`, index => {
        state.form.expenses.monthlyInvestments.splice(index, 1);
        renderCommonLists();
        renderMonthlySummary();
        renderInvestmentsTab();
      });
    }


    function renderPersonCards() {
      const row = document.getElementById('person-cards-row');
      if (!row) return;
      row.innerHTML = '';

      getLoadedAdults().forEach(adult => {
        const archivedAdult = isArchivedMember(adult.id, 'adult');
        const card = document.createElement('details');
        card.className = 'workspace-accordion person-card';
        card.setAttribute('data-mobile-collapsed', '');
        const incomeBlock = state.form.incomes.adults[adult.id] || { mainFixed: 0, mainLabel: adult.mainIncomeLabel || 'Ingreso principal', recurring: {}, other: [] };
        const activeRecurring = adult.extraIncomeLabels || [];
        const archivedRecurring = Object.entries(incomeBlock.recurring || {})
          .filter(([id, item]) => !activeRecurring.some(active => active.id === id) && num(item?.amount))
          .map(([id, item]) => ({ id, label: item.label || 'Ingreso antiguo', archived: true }));
        const recurringToRender = [...activeRecurring.map(item => ({ ...item, archived: false })), ...archivedRecurring];
        const personalExpenseTotal = sumList(state.form.expenses.adults[adult.id] || []);
        const totalAdultIncome = num(incomeBlock.mainFixed)
          + Object.values(incomeBlock.recurring || {}).reduce((acc, item) => acc + num(item.amount), 0)
          + sumList(incomeBlock.other || []);

        card.innerHTML = `
          <summary>
            <span>
              <strong>${escapeHtml(adult.name)} · ingresos y gastos${archivedAdult ? ' · Histórico' : ''}</strong>
              <small>Ingresos ${formatCurrency(totalAdultIncome)} · Gastos ${formatCurrency(personalExpenseTotal)}</small>
            </span>
          </summary>
          <div class="accordion-body">
          <div class="person-sections">
            <section class="person-section income-section">
              <div class="person-section-title">
                <span>Ingresos</span>
                <span class="chip-note">Entradas de dinero</span>
              </div>
              <div class="field-row">
                <div>
                  <label>${escapeHtml(incomeBlock.mainLabel || 'Ingreso principal')}</label>
                  <input type="number" min="0" step="0.01" value="${num(incomeBlock.mainFixed)}" data-adult-income="${adult.id}" />
                </div>
                <div class="empty-box">
                  Aquí puedes registrar el ingreso estable de ${escapeHtml(adult.name)} y los ingresos que se repiten o solo ocurren este mes.
                </div>
              </div>

              ${recurringToRender.length ? `
                <div class="category-card" style="margin-top:16px; background: rgba(255,255,255,0.62); border-style: solid; border-color: #d8ebe5;">
                  <div class="section-title"><h3>Otros ingresos recurrentes</h3><span class="muted">Se mantienen visibles en meses históricos</span></div>
                  <div class="field-row">
                    ${recurringToRender.map(item => `
                      <div>
                        <label>${escapeHtml(item.label)}${item.archived ? ' (histórico)' : ''}</label>
                        <input type="number" min="0" step="0.01" value="${num((incomeBlock.recurring || {})[item.id]?.amount || 0)}" data-adult-recurring="${adult.id}" data-recurring-id="${item.id}" />
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <div class="category-card" style="margin-top:16px; background: rgba(255,255,255,0.62); border-style: solid; border-color: #d8ebe5;">
                <div class="section-title"><h3>Otros ingresos puntuales del mes</h3></div>
                <div class="field-row-3">
                  <div><label>Concepto</label><input type="text" id="adult-income-name-${adult.id}" placeholder="Ej. bonus / devolución / venta" /></div>
                  <div><label>Importe</label><input type="number" min="0" step="0.01" id="adult-income-amount-${adult.id}" /></div>
                  <button class="btn btn-soft" data-add-adult-income-item="${adult.id}">Añadir ingreso</button>
                </div>
                <div id="adult-income-list-${adult.id}" class="dynamic-list"></div>
              </div>
            </section>

            <section class="person-section expense-section">
              <div class="person-section-title">
                <span>Gastos personales</span>
                <span class="chip-note" style="background:#fff1e8; color:#c46a1a; border-color:#f3d8c9;">Salidas de dinero</span>
              </div>
              <div class="field-row">
                <div>
                  <label>Concepto rápido</label>
                  <input type="text" id="quick-expense-name-${adult.id}" placeholder="Ej. Transporte" />
                </div>
                <div>
                  <label>Importe gasto personal</label>
                  <input type="number" min="0" step="0.01" id="quick-expense-amount-${adult.id}" />
                </div>
              </div>
              <div class="actions" style="justify-content:flex-start; margin-top:12px;">
                <button class="btn btn-soft" data-add-adult-expense="${adult.id}">Añadir gasto</button>
              </div>
              <div class="category-card" style="margin-top:16px; background: rgba(255,255,255,0.62); border-style: solid; border-color: #f3d8c9;">
                <div class="section-title"><h3>Listado de gastos personales</h3></div>
                <div id="adult-expense-list-${adult.id}" class="dynamic-list"></div>
              </div>
            </section>
          </div>
          </div>
        `;
        row.appendChild(card);
      });

      getLoadedChildren().forEach(child => {
        const archivedChild = isArchivedMember(child.id, 'child');
        const card = document.createElement('details');
        card.className = 'workspace-accordion person-card';
        card.setAttribute('data-mobile-collapsed', '');
        card.innerHTML = `
          <summary>
            <span>
              <strong>${escapeHtml(child.name)} · gastos${archivedChild ? ' · Histórico' : ''}</strong>
              <small>${escapeHtml(child.note || 'Dependiente')} · Gastos ${formatCurrency(sumList(state.form.expenses.children[child.id] || []))}</small>
            </span>
          </summary>
          <div class="accordion-body">
          <section class="person-section children-section">
            <div class="person-section-title">
              <span>Gastos del dependiente</span>
              <span class="chip-note" style="background:#eef3ff; color:#3159b6; border-color:#d8e1f5;">Seguimiento</span>
            </div>
            <div class="field-row">
              <div>
                <label>Categoría</label>
                <select id="child-category-${child.id}">
                  <option value="Colegio">Colegio</option>
                  <option value="Ropa">Ropa</option>
                  <option value="Medicinas">Medicinas</option>
                  <option value="Actividades">Actividades</option>
                  <option value="Juguetes / ocio">Juguetes / ocio</option>
                  <option value="Comida">Comida</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>
              <div>
                <label>Importe</label>
                <input type="number" min="0" step="0.01" id="child-amount-${child.id}" />
              </div>
            </div>
            <div class="field-row" style="margin-top:12px; grid-template-columns: 1fr auto; align-items:end;">
              <div>
                <label>Concepto</label>
                <input type="text" id="child-name-input-${child.id}" placeholder="Ej. mensualidad / abrigo" />
              </div>
              <button class="btn btn-soft" data-add-child-expense="${child.id}">Añadir gasto</button>
            </div>
            <div class="category-card" style="margin-top:16px; background: rgba(255,255,255,0.62); border-style: solid; border-color: #d8e1f5;">
              <div class="section-title"><h3>Listado de gastos</h3></div>
              <div id="child-expense-list-${child.id}" class="dynamic-list"></div>
            </div>
          </section>
          </div>
        `;
        row.appendChild(card);
      });

      bindPersonCards();
      bindAccordionBehavior(row);
    }

    function bindPersonCards() {
      document.querySelectorAll('[data-adult-income]').forEach(input => {
        input.addEventListener('input', () => {
          const adultId = input.dataset.adultIncome;
          state.form.incomes.adults[adultId].mainFixed = parseFloat(input.value || 0) || 0;
          renderMonthlySummary();
        });
      });
      document.querySelectorAll('[data-adult-recurring]').forEach(input => {
        input.addEventListener('input', () => {
          const adultId = input.dataset.adultRecurring;
          const recurringId = input.dataset.recurringId;
          state.form.incomes.adults[adultId].recurring ||= {};
          state.form.incomes.adults[adultId].recurring[recurringId] ||= { label: 'Ingreso recurrente', amount: 0 };
          state.form.incomes.adults[adultId].recurring[recurringId].amount = parseFloat(input.value || 0) || 0;
          renderMonthlySummary();
        });
      });
      document.querySelectorAll('[data-add-adult-income-item]').forEach(btn => {
        btn.addEventListener('click', () => {
          const adultId = btn.dataset.addAdultIncomeItem;
          const name = document.getElementById(`adult-income-name-${adultId}`).value.trim();
          const amount = parseFloat(document.getElementById(`adult-income-amount-${adultId}`).value || 0);
          if (!name || !amount) return;
          state.form.incomes.adults[adultId].other.push({ name, amount });
          document.getElementById(`adult-income-name-${adultId}`).value = '';
          document.getElementById(`adult-income-amount-${adultId}`).value = '';
          renderPersonCards();
          renderMonthlySummary();
        });
      });
      document.querySelectorAll('[data-add-adult-expense]').forEach(btn => {
        btn.addEventListener('click', () => {
          const adultId = btn.dataset.addAdultExpense;
          const name = document.getElementById(`quick-expense-name-${adultId}`).value.trim();
          const amount = parseFloat(document.getElementById(`quick-expense-amount-${adultId}`).value || 0);
          if (!name || !amount) return;
          state.form.expenses.adults[adultId].push({ name, amount });
          document.getElementById(`quick-expense-name-${adultId}`).value = '';
          document.getElementById(`quick-expense-amount-${adultId}`).value = '';
          renderPersonCards();
          renderMonthlySummary();
        });
      });
      document.querySelectorAll('[data-add-child-expense]').forEach(btn => {
        btn.addEventListener('click', () => {
          const childId = btn.dataset.addChildExpense;
          const name = document.getElementById(`child-name-input-${childId}`).value.trim();
          const amount = parseFloat(document.getElementById(`child-amount-${childId}`).value || 0);
          const category = document.getElementById(`child-category-${childId}`).value;
          if (!name || !amount) return;
          state.form.expenses.children[childId].push({ name, amount, category });
          document.getElementById(`child-name-input-${childId}`).value = '';
          document.getElementById(`child-amount-${childId}`).value = '';
          renderPersonCards();
          renderMonthlySummary();
        });
      });

      getLoadedAdults().forEach(adult => {
        const archivedAdult = isArchivedMember(adult.id, 'adult');
        renderSimpleDynamicList(`adult-income-list-${adult.id}`, state.form.incomes.adults[adult.id].other, item => item.name, index => {
          state.form.incomes.adults[adult.id].other.splice(index, 1);
          renderPersonCards();
          renderMonthlySummary();
        });
        renderSimpleDynamicList(`adult-expense-list-${adult.id}`, state.form.expenses.adults[adult.id], item => item.name, index => {
          state.form.expenses.adults[adult.id].splice(index, 1);
          renderPersonCards();
          renderMonthlySummary();
        });
      });
      getLoadedChildren().forEach(child => {
        const archivedChild = isArchivedMember(child.id, 'child');
        renderSimpleDynamicList(`child-expense-list-${child.id}`, state.form.expenses.children[child.id], item => `${item.category} · ${item.name}`, index => {
          state.form.expenses.children[child.id].splice(index, 1);
          renderPersonCards();
          renderMonthlySummary();
        });
      });
    }

    function renderSimpleDynamicList(containerId, list, labelFn, onRemove) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      if (!list || !list.length) {
        container.innerHTML = '<div class="list-row"><span class="muted">Todavía no hay elementos añadidos.</span></div>';
        return;
      }
      list.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'list-row';
        row.innerHTML = `
          <div><strong>${escapeHtml(labelFn(item))}</strong></div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span class="amount">${formatCurrency(item.amount)}</span>
            <button class="btn btn-danger btn-inline">Eliminar</button>
          </div>
        `;
        row.querySelector('button').addEventListener('click', () => onRemove(index));
        container.appendChild(row);
      });
    }

    function calculateHousingSummary(profile = state.profile, periodsMap = null) {
      const housing = profile?.housing || createEmptyProfile().housing;
      const totalPrice = num(housing.targetPrice);
      const entryPaid = num(housing.entryPaid);
      const extraPaymentsTotal = (housing.extraPayments || []).reduce((acc, item) => acc + num(item.amount), 0);
      const periodSource = periodsMap || {};
      const hipotecaPaid = Object.values(periodSource).reduce((acc, data) => acc + num(data?.expenses?.commonFixed?.viviendaHipoteca), 0);
      const paid = entryPaid + extraPaymentsTotal + hipotecaPaid;
      const pending = Math.max(0, totalPrice - paid);
      const percent = totalPrice > 0 ? Math.min(100, (paid / totalPrice) * 100) : 0;
      return { totalPrice, entryPaid, extraPaymentsTotal, hipotecaPaid, paid, pending, percent };
    }

    function renderHousingExtraPayments() {
      const container = document.getElementById('housing-extra-list');
      if (!container) return;
      const extras = state.profile?.housing?.extraPayments || [];
      if (!extras.length) {
        container.innerHTML = '<div class="list-row"><span class="muted">Todavía no hay pagos extraordinarios añadidos.</span></div>';
        return;
      }
      container.innerHTML = '';
      extras.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'list-row';
        row.innerHTML = `
          <div>
            <strong>${escapeHtml(item.name || 'Pago extraordinario')}</strong>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span class="amount">${formatCurrency(item.amount)}</span>
            <button class="btn btn-danger btn-inline">Eliminar</button>
          </div>
        `;
        row.querySelector('button').addEventListener('click', async () => {
          state.profile.housing.extraPayments.splice(index, 1);
          await storageAdapter.saveProfile(state.profile);
          await renderInvestmentsTab();
        });
        container.appendChild(row);
      });
    }

    async function saveHousingSettings() {
      state.profile.housing ||= structuredClone(createEmptyProfile().housing);
      state.profile.housing.targetPrice = num(document.getElementById('housing-target-price')?.value || 0);
      state.profile.housing.entryPaid = num(document.getElementById('housing-entry-paid')?.value || 0);
      state.profile.updatedAt = new Date().toISOString();
      try {
        await storageAdapter.saveProfile(state.profile);
        const el = document.getElementById('housing-status');
        if (el) {
          el.style.color = 'var(--good)';
          el.textContent = 'Vivienda guardada correctamente.';
        }
        await renderInvestmentsTab();
      } catch (error) {
        const el = document.getElementById('housing-status');
        if (el) {
          el.style.color = 'var(--bad)';
          el.textContent = error?.message || 'No se pudo guardar la vivienda.';
        }
      }
    }

    async function addHousingExtraPayment() {
      const name = document.getElementById('housing-extra-name')?.value.trim();
      const amount = num(document.getElementById('housing-extra-amount')?.value || 0);
      if (!name || !amount) return;
      state.profile.housing ||= structuredClone(createEmptyProfile().housing);
      state.profile.housing.extraPayments ||= [];
      state.profile.housing.extraPayments.push({ id: createId('housing'), name, amount });
      document.getElementById('housing-extra-name').value = '';
      document.getElementById('housing-extra-amount').value = '';
      await storageAdapter.saveProfile(state.profile);
      await renderInvestmentsTab();
    }

    function calculateTotals(profile = state.profile, form = state.form) {
      const loadedContext = form === state.form ? getLoadedFormContext() : null;
      const contextAdults = loadedContext ? (loadedContext.adults || []) : getActiveAdults(profile);
      const contextChildren = loadedContext ? (loadedContext.children || []) : getActiveChildren(profile);

      const incomeAdults = contextAdults.map(adult => {
        const data = form.incomes?.adults?.[adult.id] || { mainFixed: 0, recurring: {}, other: [] };
        const recurringTotal = Object.values(data.recurring || {}).reduce((acc, item) => acc + num(item.amount), 0);
        return { adult, total: num(data.mainFixed) + recurringTotal + sumList(data.other) };
      });
      const totalIncome = incomeAdults.reduce((acc, item) => acc + item.total, 0);

      const commonFixed = Object.values(form.expenses?.commonFixed || {}).reduce((a, b) => a + num(b), 0)
        + Object.values(form.expenses?.commonFixedExtra || {}).reduce((a, b) => a + num(b), 0);
      const supermarket = sumList(form.expenses?.supermarket || []);
      const commonOther = sumList(form.expenses?.commonOther || []);
      const commonExpenses = commonFixed + supermarket + commonOther;

      const adultsExpenses = contextAdults.map(adult => ({ adult, total: sumList(form.expenses?.adults?.[adult.id] || []) }));
      const personalExpenses = adultsExpenses.reduce((acc, item) => acc + item.total, 0);
      const childrenExpenses = contextChildren.map(child => ({ child, total: sumList(form.expenses?.children?.[child.id] || []) }));
      const dependentExpenses = childrenExpenses.reduce((acc, item) => acc + item.total, 0);

      const investments = sumList(getFundMonthlyInvestments(form.expenses?.monthlyInvestments || []));
      const livingExpenses = commonExpenses + personalExpenses + dependentExpenses;
      const savingsBreakdown = HomeFlowCore.calculateSavingsBreakdown(totalIncome, livingExpenses, investments);
      const totalExpenses = savingsBreakdown.totalOutflows;
      const savings = savingsBreakdown.availableSavings;
      const savingsRate = savingsBreakdown.availableSavingsRate;
      const fixedPositionsTotal = currentInvestmentPositions()
        .filter(item => getInvestmentCategory(item.type) === 'fixed')
        .reduce((acc, item) => acc + num(item.amount), 0);
      const fixedIncomeTotal = form === state.form && state.investmentTotals
        ? num(state.investmentTotals.fixed)
        : fixedPositionsTotal;

      return {
        incomeAdults,
        totalIncome,
        commonFixed,
        supermarket,
        commonOther,
        commonExpenses,
        adultsExpenses,
        personalExpenses,
        childrenExpenses,
        dependentExpenses,
        investments,
        livingExpenses,
        longTermInvestment: savingsBreakdown.longTermInvestment,
        fixedIncomeTotal,
        totalExpenses,
        savings,
        savingsRate,
        totalSavings: savingsBreakdown.totalSavings,
        totalSavingsRate: savingsBreakdown.totalSavingsRate
      };
    }

    function renderMonthlySummary() {
      const totals = calculateTotals();
      setText('kpi-income', formatCurrency(totals.totalIncome));
      setText('kpi-expenses', formatCurrency(totals.livingExpenses));
      setText('kpi-savings', formatCurrency(totals.savings));
      setText('kpi-rate', formatPercent(totals.totalSavingsRate));
      setText('kpi-investments', formatCurrency(totals.investments));
      setText('kpi-total-savings', formatCurrency(totals.totalSavings));

      const savingsKpi = document.getElementById('kpi-savings').closest('.kpi');
      savingsKpi.classList.toggle('positive', totals.savings >= 0);
      savingsKpi.classList.toggle('negative', totals.savings < 0);
      const totalSavingsKpi = document.getElementById('kpi-total-savings')?.closest('.kpi');
      totalSavingsKpi?.classList.toggle('positive', totals.totalSavings >= 0);
      totalSavingsKpi?.classList.toggle('negative', totals.totalSavings < 0);

      document.getElementById('totals-income-box').innerHTML = totals.incomeAdults.map(item => (
        `<div class="total-item"><strong>Ingresos ${escapeHtml(item.adult.name)}</strong><span class="amount">${formatCurrency(item.total)}</span></div>`
      )).join('') + `<div class="total-item"><strong>Ingresos totales</strong><span class="amount">${formatCurrency(totals.totalIncome)}</span></div>`;

      document.getElementById('totals-expenses-box').innerHTML = `
        <div class="total-item"><strong>Gastos comunes</strong><span class="amount">${formatCurrency(totals.commonExpenses)}</span></div>
        <div class="total-item"><strong>Gastos personales</strong><span class="amount">${formatCurrency(totals.personalExpenses)}</span></div>
        <div class="total-item"><strong>Gastos hijos</strong><span class="amount">${formatCurrency(totals.dependentExpenses)}</span></div>
        <div class="total-item"><strong>Gastos de vida</strong><span class="amount">${formatCurrency(totals.livingExpenses)}</span></div>
        <div class="total-item"><strong>Inversión a largo plazo</strong><span class="amount">${formatCurrency(totals.investments)}</span></div>
      `;

      document.getElementById('totals-balance-box').innerHTML = `
        <div class="total-item"><strong>Ahorro disponible</strong><span class="amount">${formatCurrency(totals.savings)}</span></div>
        <div class="total-item"><strong>Ahorro a largo plazo</strong><span class="amount">${formatCurrency(totals.investments)}</span></div>
        <div class="total-item"><strong>Ahorro total</strong><span class="amount">${formatCurrency(totals.totalSavings)}</span></div>
        <div class="total-item"><strong>Tasa disponible</strong><span class="amount">${formatPercent(totals.savingsRate)}</span></div>
        <div class="total-item"><strong>Tasa de ahorro total</strong><span class="amount">${formatPercent(totals.totalSavingsRate)}</span></div>
        <div class="total-item"><strong>Renta fija acumulada</strong><span class="amount">${formatCurrency(totals.fixedIncomeTotal)}</span></div>
        <div class="total-item"><strong>Salidas totales</strong><span class="amount">${formatCurrency(totals.totalExpenses)}</span></div>
      `;
    }

    async function refreshHistoricalView() {
      if (!state.currentUser) return;
      const all = await storageAdapter.getAllPeriods();
      const rows = Object.entries(all)
        .map(([period, data]) => ({ period, data, totals: calculateTotalsForData(data) }))
        .sort((a, b) => a.period.localeCompare(b.period));
      renderHistoryMetrics(rows);
      renderHistoryTable(rows);
      renderHistoryCharts(rows);
      renderHistoryIncomeBreakdown(rows);
      renderHistoryInvestments(rows);
    }

    function calculateTotalsForData(data) {
      const context = getProfileContextForData(data, state.profile);
      const profileForCalc = {
        ...createEmptyProfile(),
        adults: context.adults,
        children: context.children,
        fixedExpenseLabels: context.fixedExpenseLabels,
        extraFixedExpenseLabels: context.extraFixedExpenseLabels
      };
      const normalizedForm = ensurePeriodStructure(data, {
        adults: context.adults,
        children: context.children,
        extraFixedExpenseLabels: context.extraFixedExpenseLabels
      });
      return calculateTotals(profileForCalc, normalizedForm);
    }

    function renderHistoryMetrics(rows) {
      const income = rows.reduce((acc, row) => acc + row.totals.totalIncome, 0);
      const expenses = rows.reduce((acc, row) => acc + row.totals.totalExpenses, 0);
      const cumulativeSavings = rows.reduce((acc, row) => acc + row.totals.savings, 0);
      const cumulativeTotalSavings = rows.reduce((acc, row) => acc + row.totals.totalSavings, 0);
      const avgRate = rows.length ? rows.reduce((acc, row) => acc + row.totals.totalSavingsRate, 0) / rows.length : 0;
      setText('hist-total-income', formatCurrency(income));
      setText('hist-total-expenses', formatCurrency(expenses));
      setText('hist-total-savings', formatCurrency(cumulativeSavings));
      setText('hist-total-savings-total', formatCurrency(cumulativeTotalSavings));
      setText('hist-average-rate', formatPercent(avgRate));
      setText('hist-count', String(rows.length));
    }

    function renderHistoryTable(rows) {
      const tbody = document.getElementById('history-table-body');
      const mobileList = document.getElementById('history-mobile-list');
      tbody.innerHTML = '';
      if (mobileList) mobileList.innerHTML = '';
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="12" class="muted">No hay períodos guardados todavía.</td></tr>';
        if (mobileList) mobileList.innerHTML = '<div class="empty-box">No hay períodos guardados todavía.</div>';
        return;
      }
      let cumulativeSavings = 0;
      rows.forEach(row => {
        cumulativeSavings += row.totals.savings;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${formatPeriod(row.period)}</td>
          <td>${formatCurrency(row.totals.totalIncome)}</td>
          <td>${formatCurrency(row.totals.commonExpenses)}</td>
          <td>${formatCurrency(row.totals.personalExpenses)}</td>
          <td>${formatCurrency(row.totals.dependentExpenses)}</td>
          <td>${formatCurrency(row.totals.investments)}</td>
          <td>${formatCurrency(row.totals.totalExpenses)}</td>
          <td>${formatCurrency(row.totals.savings)}</td>
          <td>${formatCurrency(cumulativeSavings)}</td>
          <td>${formatCurrency(row.totals.totalSavings)}</td>
          <td>${formatPercent(row.totals.totalSavingsRate)}</td>
          <td><button class="btn btn-soft btn-inline" data-open-period="${row.period}">Abrir</button></td>
        `;
        tbody.appendChild(tr);
        if (mobileList) {
          const card = document.createElement('article');
          card.className = 'history-month-card';
          card.innerHTML = `
            <div class="history-month-card-header">
              <h3>${formatPeriod(row.period)}</h3>
              <span class="badge ${row.totals.totalSavings >= 0 ? 'good' : 'warn'}">${formatPercent(row.totals.totalSavingsRate)}</span>
            </div>
            <div class="history-month-grid">
              <div class="history-month-stat"><span>Ingresos</span><strong>${formatCurrency(row.totals.totalIncome)}</strong></div>
              <div class="history-month-stat"><span>Gastos de vida</span><strong>${formatCurrency(row.totals.livingExpenses)}</strong></div>
              <div class="history-month-stat"><span>Disponible</span><strong>${formatCurrency(row.totals.savings)}</strong></div>
              <div class="history-month-stat"><span>Largo plazo</span><strong>${formatCurrency(row.totals.investments)}</strong></div>
              <div class="history-month-stat"><span>Ahorro total</span><strong>${formatCurrency(row.totals.totalSavings)}</strong></div>
            </div>
            <button type="button" class="btn btn-soft" data-open-period="${row.period}">Abrir y editar este mes</button>
          `;
          mobileList.appendChild(card);
        }
      });
      document.querySelectorAll('[data-open-period]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const [year, month] = btn.dataset.openPeriod.split('-');
          document.getElementById('period-year').value = year;
          document.getElementById('period-month').value = month;
          activateTab('mensual');
          await loadSelectedPeriod();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }

    function renderHistoryInvestments(rows) {
      const body = document.getElementById('history-investments-body');
      body.innerHTML = '';
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="2" class="muted">Sin datos.</td></tr>';
      } else {
        rows.forEach(row => {
          const detail = (row.data.expenses?.monthlyInvestments || [])
            .map(item => `${escapeHtml(item.type || 'Inversión')} · ${escapeHtml(item.owner || 'Hogar')} · ${escapeHtml(item.name || '')} (${formatCurrency(item.amount)})`)
            .join('<br>') || '<span class="muted">Sin inversión ese mes</span>';
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${formatPeriod(row.period)}</td><td>${detail}</td>`;
          body.appendChild(tr);
        });
      }
    }


    function normalizeIncomePayerName(value) {
      return String(value || 'Sin pagador').trim() || 'Sin pagador';
    }

    function getIncomeBreakdownAdultsFromRows(rows) {
      const adultsById = new Map();
      rows.forEach(row => {
        const context = getProfileContextForData(row.data, state.profile);
        (context.adults || []).forEach(adult => {
          if (!adult?.id) return;
          if (!adultsById.has(adult.id)) {
            adultsById.set(adult.id, {
              id: adult.id,
              name: adult.name || 'Adulto',
              label: adult.name || 'Adulto'
            });
          }
        });
      });
      return Array.from(adultsById.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
    }

    function collectAdultIncomeBreakdown(periodData, adult) {
      const incomeBlock = periodData?.incomes?.adults?.[adult.id] || {};
      const payerMap = new Map();
      const addPayer = (payerName, amount) => {
        const value = num(amount);
        if (!value) return;
        const label = normalizeIncomePayerName(payerName);
        const key = label.toLocaleLowerCase('es');
        if (!payerMap.has(key)) payerMap.set(key, { label, amount: 0 });
        payerMap.get(key).amount += value;
      };

      addPayer(incomeBlock.mainLabel || adult.mainIncomeLabel || 'Ingreso principal', incomeBlock.mainFixed);
      Object.values(incomeBlock.recurring || {}).forEach(item => addPayer(item?.label || 'Ingreso recurrente', item?.amount));
      (incomeBlock.other || []).forEach(item => addPayer(item?.name || 'Ingreso puntual', item?.amount));

      return Array.from(payerMap.values());
    }

    function buildIncomeBreakdownHistory(rows, selectedAdultId = 'household') {
      const payersByKey = new Map();
      const periodBreakdowns = rows.map(row => {
        const context = getProfileContextForData(row.data, state.profile);
        const adults = selectedAdultId === 'household'
          ? (context.adults || [])
          : (context.adults || []).filter(adult => adult.id === selectedAdultId);
        const values = new Map();

        adults.forEach(adult => {
          collectAdultIncomeBreakdown(row.data, adult).forEach(item => {
            const key = item.label.toLocaleLowerCase('es');
            if (!payersByKey.has(key)) payersByKey.set(key, item.label);
            values.set(key, (values.get(key) || 0) + num(item.amount));
          });
        });

        return { period: row.period, values };
      });

      const payerKeys = Array.from(payersByKey.keys()).sort((a, b) => payersByKey.get(a).localeCompare(payersByKey.get(b), 'es'));
      return { payerKeys, payerLabels: payerKeys.map(key => payersByKey.get(key)), periodBreakdowns };
    }

    function renderHistoryIncomeBreakdown(rows) {
      const select = document.getElementById('history-income-owner-select');
      const head = document.getElementById('history-income-breakdown-head');
      const body = document.getElementById('history-income-breakdown-body');
      if (!select || !head || !body) return;

      const adults = getIncomeBreakdownAdultsFromRows(rows);
      const previousValue = select.value || 'household';
      select.innerHTML = '<option value="household">Hogar</option>' + adults.map(adult => `<option value="${escapeHtml(adult.id)}">${escapeHtml(adult.label)}</option>`).join('');
      select.value = adults.some(adult => adult.id === previousValue) ? previousValue : 'household';
      select.onchange = () => renderHistoryIncomeBreakdown(rows);

      const breakdown = buildIncomeBreakdownHistory(rows, select.value);
      const labels = rows.map(row => formatPeriodShort(row.period));
      const palette = ['#2563eb', '#0f766e', '#f59e0b', '#8b5cf6', '#f97316', '#22c55e', '#0ea5e9', '#a855f7', '#14b8a6', '#64748b', '#dc2626', '#84cc16'];
      const datasets = breakdown.payerKeys.map((key, index) => ({
        label: breakdown.payerLabels[index],
        data: breakdown.periodBreakdowns.map(item => round2(item.values.get(key) || 0)),
        backgroundColor: palette[index % palette.length],
        stack: 'pagadores'
      }));

      buildChart('history-income-breakdown-chart', {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { stacked: true, beginAtZero: true, ticks: { callback: v => formatCurrency(v, false) } },
            x: { stacked: true }
          },
          plugins: { legend: { position: 'bottom' } }
        }
      });

      if (!rows.length) {
        head.innerHTML = '';
        body.innerHTML = '<tr><td class="muted">No hay períodos guardados todavía.</td></tr>';
        return;
      }

      if (!breakdown.payerKeys.length) {
        head.innerHTML = '<tr><th>Período</th><th>Total</th></tr>';
        body.innerHTML = rows.map(row => `<tr><td>${formatPeriod(row.period)}</td><td>${formatCurrency(0)}</td></tr>`).join('');
        return;
      }

      head.innerHTML = `<tr><th>Período</th>${breakdown.payerLabels.map(label => `<th>${escapeHtml(label)}</th>`).join('')}<th>Total</th></tr>`;
      body.innerHTML = breakdown.periodBreakdowns.map(item => {
        const values = breakdown.payerKeys.map(key => num(item.values.get(key) || 0));
        const total = values.reduce((acc, value) => acc + value, 0);
        return `<tr><td>${formatPeriod(item.period)}</td>${values.map(value => `<td>${formatCurrency(value)}</td>`).join('')}<td><strong>${formatCurrency(total)}</strong></td></tr>`;
      }).join('');
    }


    function renderHistoryCharts(rows) {
      const labels = rows.map(row => formatPeriodShort(row.period));
      const incomes = rows.map(r => round2(r.totals.totalIncome));
      const commonExpenses = rows.map(r => round2(r.totals.commonExpenses));
      const personalExpenses = rows.map(r => round2(r.totals.personalExpenses));
      const dependentExpenses = rows.map(r => round2(r.totals.dependentExpenses));
      const investments = rows.map(r => round2(r.totals.investments));
      const savings = rows.map(r => round2(r.totals.savings));
      const totalSavings = rows.map(r => round2(r.totals.totalSavings));
      const totalSavingsRates = rows.map(r => round2(r.totals.totalSavingsRate));
      const cumulativeTotalSavings = [];
      let runningTotalSavings = 0;
      rows.forEach(r => {
        runningTotalSavings += r.totals.totalSavings;
        cumulativeTotalSavings.push(round2(runningTotalSavings));
      });

      buildChart('history-income-chart', {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Ingresos', data: incomes, backgroundColor: '#2563eb' }] },
        options: chartOptions('y', false)
      });
      buildChart('history-distribution-chart', {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Gastos comunes', data: commonExpenses, backgroundColor: '#f59e0b', stack: 'gastos' },
            { label: 'Gastos personales', data: personalExpenses, backgroundColor: '#60a5fa', stack: 'gastos' },
            { label: 'Gastos hijos', data: dependentExpenses, backgroundColor: '#f97316', stack: 'gastos' },
            { label: 'Inversión a largo plazo', data: investments, backgroundColor: '#8b5cf6', stack: 'gastos' },
            { label: 'Ahorro disponible', data: savings, type: 'line', borderColor: '#22c55e', backgroundColor: '#22c55e', yAxisID: 'y1', tension: 0.3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { stacked: true, beginAtZero: true, ticks: { callback: v => formatCurrency(v, false) } },
            x: { stacked: true },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => formatCurrency(v, false) } }
          },
          plugins: { legend: { position: 'bottom' } }
        }
      });
      buildChart('history-savings-chart', {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Ahorro disponible mensual', data: savings, backgroundColor: '#22c55e', yAxisID: 'y' },
            { label: 'Ahorro total mensual', data: totalSavings, type: 'line', borderColor: '#8b5cf6', backgroundColor: '#8b5cf6', yAxisID: 'y', tension: 0.3 },
            { label: 'Ahorro total acumulado', data: cumulativeTotalSavings, type: 'line', borderColor: '#2563eb', backgroundColor: '#2563eb', yAxisID: 'y', tension: 0.3 },
            { label: 'Tasa de ahorro total (%)', data: totalSavingsRates, type: 'line', borderColor: '#15325b', backgroundColor: '#15325b', yAxisID: 'y1', tension: 0.3 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, ticks: { callback: v => formatCurrency(v, false) } },
            y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: v => `${v}%` } }
          },
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }

    function chartOptions(axis, stacked) {
      return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          [axis]: { stacked, beginAtZero: true, ticks: { callback: v => formatCurrency(v, false) } },
          x: { stacked }
        },
        plugins: { legend: { position: 'bottom' } }
      };
    }

    function buildChart(canvasId, config) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      if (state.charts[canvasId]) state.charts[canvasId].destroy();
      state.charts[canvasId] = new Chart(canvas, config);
    }

    function calculateCompound() {
      const initial = parseFloat(document.getElementById('compound-initial').value || 0) || 0;
      const monthly = parseFloat(document.getElementById('compound-monthly').value || 0) || 0;
      const annualRate = parseFloat(document.getElementById('compound-rate').value || 0) || 0;
      const inflation = parseFloat(document.getElementById('compound-inflation').value || 0) || 0;
      const years = parseInt(document.getElementById('compound-years').value || 0, 10) || 0;
      const target = parseFloat(document.getElementById('compound-target').value || 0) || 0;
      const monthlyRate = annualRate / 100 / 12;
      let balance = initial;
      let invested = initial;
      let targetYear = target > 0 && initial >= target ? 0 : null;
      const labels = [];
      const investedSeries = [];
      const interestSeries = [];
      const realSeries = [];
      const rows = [];
      for (let year = 1; year <= years; year++) {
        const startOfYear = balance;
        for (let month = 1; month <= 12; month++) {
          balance += monthly;
          invested += monthly;
          balance *= (1 + monthlyRate);
        }
        const interest = balance - invested;
        const realValue = balance / Math.pow(1 + inflation / 100, year);
        if (targetYear === null && target > 0 && balance >= target) targetYear = year;
        labels.push(`Año ${year}`);
        investedSeries.push(round2(invested));
        interestSeries.push(round2(interest));
        realSeries.push(round2(realValue));
        rows.push({
          year,
          startOfYear: round2(startOfYear),
          invested: round2(invested),
          interest: round2(interest),
          endOfYear: round2(balance),
          realValue: round2(realValue)
        });
      }
      const finalRealValue = years ? balance / Math.pow(1 + inflation / 100, years) : balance;
      setText('compound-final', formatCurrency(balance));
      setText('compound-invested', formatCurrency(invested));
      setText('compound-interest', formatCurrency(balance - invested));
      setText('compound-real', formatCurrency(finalRealValue));
      setText('compound-target-status', target <= 0 ? 'Sin objetivo' : targetYear === null ? 'Fuera del plazo' : targetYear === 0 ? 'Ya alcanzado' : `Año ${targetYear}`);
      document.querySelectorAll('.compound-preset').forEach(button => {
        button.classList.toggle('active', Number(button.dataset.compoundRate) === annualRate);
      });
      const interestShare = balance > 0 ? ((balance - invested) / balance) * 100 : 0;
      const targetMessage = target <= 0
        ? 'Añade un objetivo para saber en qué año podrías alcanzarlo.'
        : targetYear === null
          ? `El objetivo de ${formatCurrency(target)} no se alcanza en ${years} años con este escenario.`
          : targetYear === 0
            ? `El capital inicial ya supera el objetivo de ${formatCurrency(target)}.`
            : `El objetivo de ${formatCurrency(target)} se alcanzaría aproximadamente en el año ${targetYear}.`;
      const insight = document.getElementById('compound-insight');
      if (insight) {
        insight.innerHTML = `<strong>${targetMessage}</strong><br>Al final, los intereses representarían ${formatPercent(interestShare)} del capital. Con una inflación del ${formatPercent(inflation)}, su poder adquisitivo estimado sería ${formatCurrency(finalRealValue)}.`;
      }
      buildChart('compound-chart', {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Dinero aportado', data: investedSeries, backgroundColor: '#2563eb' },
            { label: 'Intereses generados', data: interestSeries, backgroundColor: '#22c55e' },
            {
              type: 'line',
              label: 'Valor real con inflación',
              data: realSeries,
              borderColor: '#f59e0b',
              backgroundColor: '#f59e0b',
              borderWidth: 3,
              pointRadius: 2,
              tension: 0.25
            }
          ]
        },
        options: chartOptions('y', true)
      });
      document.getElementById('compound-table-body').innerHTML = rows.map(row => `
        <tr>
          <td>${row.year}</td>
          <td>${formatCurrency(row.startOfYear)}</td>
          <td>${formatCurrency(row.invested)}</td>
          <td>${formatCurrency(row.interest)}</td>
          <td>${formatCurrency(row.endOfYear)}</td>
          <td>${formatCurrency(row.realValue)}</td>
        </tr>
      `).join('');
    }

    function parseLocalDate(dateStr) {
      const [year, month, day] = String(dateStr || '').split('-').map(Number);
      if (!year || !month || !day) return null;
      return new Date(year, month - 1, day, 12, 0, 0, 0);
    }

    function formatDateInput(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function addMonthsToDate(dateStr, months) {
      const base = parseLocalDate(dateStr);
      if (!base) return null;
      const safeMonths = Math.max(1, parseInt(months || 0, 10) || 0);
      const year = base.getFullYear();
      const monthIndex = base.getMonth();
      const day = base.getDate();
      const targetMonthIndex = monthIndex + safeMonths;
      const targetYear = year + Math.floor(targetMonthIndex / 12);
      const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
      const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const clampedDay = Math.min(day, lastDayOfTargetMonth);
      return new Date(targetYear, normalizedMonth, clampedDay, 12, 0, 0, 0);
    }

    function calculateDepositEstimate(amount, rate, start, durationMonths, nowDate = null) {
      const startDate = parseLocalDate(start);
      const endDate = addMonthsToDate(start, durationMonths);
      if (!startDate || !endDate) {
        return { end: '', totalDays: 0, daysRemaining: 0, grossInterest: 0, interest: 0, finalAmount: round2(amount), matured: false, endingSoon: false, dueToday: false };
      }
      const totalDays = Math.max(0, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
      const today = nowDate ? new Date(nowDate) : new Date();
      today.setHours(12, 0, 0, 0);
      const rawDaysRemaining = Math.round((endDate - today) / (1000 * 60 * 60 * 24));
      const matured = rawDaysRemaining < 0;
      const dueToday = rawDaysRemaining === 0;
      const daysRemaining = Math.max(0, rawDaysRemaining);
      const overdueDays = matured ? Math.abs(rawDaysRemaining) : 0;
      const endingSoon = !matured && !dueToday && daysRemaining < 10;
      const grossInterest = amount * (rate / 100) * (totalDays / 365);
      const netInterest = grossInterest * 0.81;
      return {
        end: formatDateInput(endDate),
        totalDays,
        daysRemaining,
        overdueDays,
        grossInterest: round2(grossInterest),
        interest: round2(netInterest),
        finalAmount: round2(amount + netInterest),
        matured,
        endingSoon,
        dueToday
      };
    }

    async function addDeposit() {
      const name = document.getElementById('deposit-name').value.trim();
      const bank = document.getElementById('deposit-bank').value.trim();
      const owner = document.getElementById('deposit-owner').value;
      const amount = parseFloat(document.getElementById('deposit-amount').value || 0);
      const rate = parseFloat(document.getElementById('deposit-rate').value || 0);
      const start = document.getElementById('deposit-start').value;
      const durationMonths = parseInt(document.getElementById('deposit-duration-months').value || 0, 10);
      if (!name || !bank || !amount || !start || !durationMonths) {
        return setDepositStatus('Completa todos los campos del depósito.', true);
      }
      if (durationMonths < 1) {
        return setDepositStatus('La duración debe ser de al menos 1 mes.', true);
      }
      const estimate = calculateDepositEstimate(amount, rate, start, durationMonths);
      currentDeposits().push({ id: createId('deposit'), name, bank, owner, amount, rate, start, durationMonths, createdAt: new Date().toISOString(), ...estimate });
      try {
        await storageAdapter.saveProfile(state.profile);
        await storageAdapter.saveDeposits(currentDeposits());
        ['deposit-name','deposit-bank','deposit-amount','deposit-rate','deposit-start','deposit-duration-months'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('deposit-owner').value = 'Hogar';
        setDepositStatus('Depósito añadido correctamente.');
        renderInvestmentsTab();
      } catch (error) {
        console.error(error);
        currentDeposits().pop();
        setDepositStatus(error?.message || 'No se pudo guardar el depósito.', true);
      }
    }

    function setDepositStatus(message, isError = false) {
      const el = document.getElementById('deposit-status');
      el.style.color = isError ? 'var(--bad)' : 'var(--good)';
      el.textContent = message;
    }


async function addHistoricalInvestment() {
      const name = document.getElementById('historical-investment-name')?.value.trim();
      const type = document.getElementById('historical-investment-type')?.value || 'Renta variable';
      const owner = document.getElementById('historical-investment-owner')?.value || 'Hogar';
      const amount = num(document.getElementById('historical-investment-amount')?.value || 0);
      const status = document.getElementById('historical-investment-status');
      if (!name || !amount) {
        if (status) {
          status.style.color = 'var(--bad)';
          status.textContent = 'Completa concepto e importe.';
        }
        return;
      }
      currentHistoricalInvestmentPositions().push({
        id: createId('histinv'),
        name,
        type,
        owner,
        amount,
        createdAt: new Date().toISOString()
      });
      document.getElementById('historical-investment-name').value = '';
      document.getElementById('historical-investment-type').value = 'Renta variable';
      document.getElementById('historical-investment-owner').value = 'Hogar';
      document.getElementById('historical-investment-amount').value = '';
      await storageAdapter.saveProfile(state.profile);
      if (status) {
        status.style.color = 'var(--good)';
        status.textContent = 'Inversión previa guardada.';
        setTimeout(() => { status.textContent = ''; }, 2500);
      }
      await renderInvestmentsTab();
    }

    function renderHistoricalInvestmentList() {
      const container = document.getElementById('historical-investment-list');
      if (!container) return;
      const items = [...currentHistoricalInvestmentPositions()].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      if (!items.length) {
        container.innerHTML = '<div class="list-row"><span class="muted">Todavía no has añadido inversiones previas.</span></div>';
        return;
      }
      container.innerHTML = '';
      container.className = 'compact-list';
      const visible = getVisibleMovementItems(items, 'historical-investment-list', 3);
      visible.items.forEach((item) => {
        const realIndex = currentHistoricalInvestmentPositions().findIndex(x => x.id === item.id);
        const row = document.createElement('div');
        row.className = 'compact-row';
        row.innerHTML = `
          <div class="compact-row-main">
            <div class="compact-row-title">${escapeHtml(item.name)}</div>
            <div class="compact-row-subtitle">${escapeHtml(item.type || 'Inversión')} · ${escapeHtml(item.owner || 'Hogar')} · Patrimonio previo</div>
          </div>
          <div class="compact-row-actions">
            <span class="compact-row-amount">${formatCurrency(item.amount)}</span>
            <button class="btn btn-secondary btn-inline" data-edit-investment>Editar importe</button>
            <button class="btn btn-danger btn-inline">Eliminar</button>
          </div>
        `;
        row.querySelector('[data-edit-investment]').addEventListener('click', async () => {
          const entered = prompt(`Nuevo importe para "${item.name}"`, String(num(item.amount)).replace('.', ','));
          if (entered === null) return;
          const parsed = HomeFlowCore.parseMoneyInput(entered);
          if (!Number.isFinite(parsed) || parsed <= 0) {
            alert('Introduce un importe válido mayor que cero.');
            return;
          }
          currentHistoricalInvestmentPositions()[realIndex].amount = round2(parsed);
          await storageAdapter.saveProfile(state.profile);
          await renderInvestmentsTab();
        });
        row.querySelector('.btn-danger').addEventListener('click', async () => {
          currentHistoricalInvestmentPositions().splice(realIndex, 1);
          await storageAdapter.saveProfile(state.profile);
          await renderInvestmentsTab();
        });
        container.appendChild(row);
      });
      renderMovementToggle(container, 'historical-investment-list', visible.hiddenCount);
    }

    function getInvestmentCategory(type) {
      const category = HomeFlowCore.getInvestmentCategory(type);
      return category === 'variable' ? 'funds' : category;
    }


    function buildInvestmentOwnerBreakdown(aggregatedRows, deposits) {
      const ownerMap = new Map();

      const ensureOwner = (owner) => {
        const ownerKey = owner || 'Hogar';
        if (!ownerMap.has(ownerKey)) {
          ownerMap.set(ownerKey, {
            owner: ownerKey,
            fundsBase: 0,
            funds: 0,
            fixedBase: 0,
            fixed: 0,
            deposits: 0,
            salesToCash: 0,
            transfersToFunds: 0,
            total: 0,
            fundItems: [],
            fixedItems: [],
            depositItems: [],
            saleItems: [],
            fundsTransferItems: []
          });
        }
        return ownerMap.get(ownerKey);
      };

      aggregatedRows.forEach(item => {
        const bucket = ensureOwner(item.owner || 'Hogar');
        const category = getInvestmentCategory(item.type);
        if (category === 'funds') {
          bucket.fundsBase += num(item.amount);
          bucket.fundItems.push(item);
        } else if (category === 'fixed') {
          bucket.fixedBase += num(item.amount);
          bucket.fixedItems.push(item);
        }
      });

      currentHistoricalInvestmentPositions().forEach(item => {
        const bucket = ensureOwner(item.owner || 'Hogar');
        const category = getInvestmentCategory(item.type);
        if (category === 'funds') {
          bucket.fundsBase += num(item.amount);
          bucket.fundItems.push(item);
        } else if (category === 'fixed') {
          bucket.fixedBase += num(item.amount);
          bucket.fixedItems.push(item);
        }
      });

      deposits.filter(isDepositActive).forEach(item => {
        const bucket = ensureOwner(item.owner || 'Hogar');
        bucket.deposits += num(item.amount);
        bucket.depositItems.push(item);
      });

      getSavedFixedIncomeSales().forEach(item => {
        const bucket = ensureOwner(item.owner || 'Hogar');
        bucket.salesToCash += num(item.amount);
        bucket.saleItems.push(item);
      });

      getSavedFixedIncomeTransfersToFunds().forEach(item => {
        const bucket = ensureOwner(item.owner || 'Hogar');
        bucket.transfersToFunds += num(item.amount);
        bucket.fundsTransferItems.push(item);
      });

      return Array.from(ownerMap.values())
        .map(bucket => {
          const fixedOut = bucket.salesToCash + bucket.transfersToFunds;
          bucket.fixed = Math.max(0, bucket.fixedBase - fixedOut);
          bucket.funds = bucket.fundsBase + bucket.transfersToFunds;
          bucket.total = bucket.funds + bucket.fixed + bucket.deposits;
          return bucket;
        })
        .filter(bucket => bucket.total > 0 || bucket.salesToCash > 0 || bucket.transfersToFunds > 0)
        .sort((a, b) => b.total - a.total);
    }


    async function addInvestmentTransfer(ownerName, kind = 'toCash') {
      const ownerSlug = slugify(ownerName || 'hogar');
      const amountInput = document.getElementById(`${kind}-amount-${ownerSlug}`);
      const noteInput = document.getElementById(`${kind}-note-${ownerSlug}`);
      if (!amountInput) return;
      const amount = num(amountInput.value || 0);
      const note = noteInput ? noteInput.value.trim() : '';
      if (!amount) return;

      const breakdown = buildInvestmentOwnerBreakdown((await getAggregatedMonthlyInvestments()).rows, currentDeposits());
      const ownerData = breakdown.find(item => item.owner === ownerName);
      const availableFixed = ownerData ? ownerData.fixed : 0;
      const statusId = kind === 'toFunds' ? `fund-transfer-status-${ownerSlug}` : `transfer-status-${ownerSlug}`;
      if (amount > availableFixed) {
        const listContainer = document.getElementById(statusId);
        if (listContainer) {
          listContainer.textContent = `No puedes mover más de ${formatCurrency(availableFixed)} desde renta fija.`;
          listContainer.style.color = 'var(--bad)';
        }
        return;
      }

      currentInvestmentTransfers().push({
        id: createId('transfer'),
        kind,
        owner: ownerName || 'Hogar',
        amount,
        note,
        createdAt: new Date().toISOString()
      });
      await storageAdapter.saveProfile(state.profile);
      if (amountInput) amountInput.value = '';
      if (noteInput) noteInput.value = '';
      await renderInvestmentsTab();
    }

    async function removeInvestmentTransfer(transferId) {
      const idx = currentInvestmentTransfers().findIndex(item => item.id === transferId);
      if (idx === -1) return;
      currentInvestmentTransfers().splice(idx, 1);
      await storageAdapter.saveProfile(state.profile);
      await renderInvestmentsTab();
    }

    function getSavedFixedIncomeSales() {
      return currentInvestmentTransfers().filter(item => String(item?.kind || 'toCash') === 'toCash');
    }

    function getSavedFixedIncomeSalesTotal() {
      return getSavedFixedIncomeSales().reduce((acc, item) => acc + num(item.amount), 0);
    }

    async function closeDeposit(depositId) {
      const deposit = currentDeposits().find(item => item.id === depositId);
      if (!deposit || isDepositClosed(deposit)) return;
      deposit.status = 'closed';
      deposit.closedAt = new Date().toISOString();
      deposit.closedInterest = round2(deposit.interest || 0);
      await storageAdapter.saveProfile(state.profile);
      await storageAdapter.saveDeposits(currentDeposits());
      await renderInvestmentsTab();
    }

    function renderDepositInterestByYear(deposits = currentDeposits()) {
      const container = document.getElementById('deposit-interest-year-list');
      if (!container) return;
      const groups = HomeFlowCore.groupClosedDepositInterestByYear(deposits);
      if (!groups.length) {
        container.innerHTML = '<div class="empty-box">Todavía no hay depósitos cobrados.</div>';
        return;
      }
      container.innerHTML = groups.map(group => `
        <details class="category-card collapsible-note">
          <summary>
            <span>Intereses depósitos ${escapeHtml(group.year)}</span>
            <strong style="float:right; color:var(--good);">${formatCurrency(group.total)}</strong>
          </summary>
          <div class="compact-list">
            ${group.deposits.map(deposit => `
              <div class="compact-row">
                <div class="compact-row-main">
                  <div class="compact-row-title">${escapeHtml(deposit.name || 'Depósito')}</div>
                  <div class="compact-row-subtitle">${escapeHtml(deposit.bank || 'Sin entidad')} · Cobrado ${deposit.closedAt ? new Date(deposit.closedAt).toLocaleDateString('es-ES') : 'sin fecha'}</div>
                </div>
                <div class="compact-row-amount">${formatCurrency(deposit.closedInterest || 0)}</div>
              </div>
            `).join('')}
          </div>
        </details>
      `).join('');
    }

    function getSavedFixedIncomeTransfersToFunds() {
      return currentInvestmentTransfers().filter(item => String(item?.kind || '') === 'toFunds');
    }

    function getSavedFixedIncomeTransfersToFundsTotal() {
      return getSavedFixedIncomeTransfersToFunds().reduce((acc, item) => acc + num(item.amount), 0);
    }

    function getVisibleMovementItems(items, listKey, limit = 3) {
      window.homeflowExpandedLists ||= {};
      const expanded = !!window.homeflowExpandedLists[listKey];
      const hiddenCount = Math.max(0, items.length - limit);
      return {
        items: expanded ? items : items.slice(0, limit),
        expanded,
        hiddenCount
      };
    }

    function renderMovementToggle(container, listKey, hiddenCount, onToggle = null) {
      if (!container || hiddenCount <= 0) return;
      const row = document.createElement('div');
      row.className = 'compact-toggle-row';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary btn-inline';
      const expanded = !!window.homeflowExpandedLists?.[listKey];
      btn.textContent = expanded ? 'Mostrar menos' : `Ver ${hiddenCount} más`;
      btn.addEventListener('click', () => {
        window.homeflowExpandedLists ||= {};
        window.homeflowExpandedLists[listKey] = !expanded;
        if (onToggle) onToggle();
        else renderInvestmentsTab();
      });
      row.appendChild(btn);
      container.appendChild(row);
    }

    function renderActiveDepositList(deposits, todayDevice) {
      const list = document.getElementById('deposit-list');
      if (!list) return;
      const activeDeposits = deposits.filter(isDepositActive);
      list.innerHTML = '';
      if (!activeDeposits.length) {
        list.className = 'dynamic-list';
        list.innerHTML = '<div class="empty-box">No hay depósitos activos.</div>';
        return;
      }

      const getDepositPriority = (deposit) => {
        if (deposit.matured) return 0;
        if (deposit.dueToday || deposit.endingSoon) return 1;
        return 2;
      };
      const orderedDeposits = activeDeposits
        .map((deposit) => ({
          ...deposit,
          ...calculateDepositEstimate(
            deposit.amount,
            deposit.rate,
            deposit.start,
            deposit.durationMonths || deposit.months || 1,
            todayDevice
          )
        }))
        .sort((a, b) => {
          const priorityDiff = getDepositPriority(a) - getDepositPriority(b);
          if (priorityDiff !== 0) return priorityDiff;
          if (a.matured && b.matured) return String(b.end || '').localeCompare(String(a.end || ''));
          return String(a.end || '').localeCompare(String(b.end || ''));
        });

      list.className = 'compact-list';
      const visibleDeposits = getVisibleMovementItems(orderedDeposits, 'deposit-list', 3);
      visibleDeposits.items.forEach((deposit) => {
        const depositIndex = deposits.findIndex(item => item.id === deposit.id);
        if (depositIndex < 0) return;
        Object.assign(deposits[depositIndex], deposit);
        const row = document.createElement('div');
        const depositStateClass = deposit.matured
          ? 'deposit-matured'
          : ((deposit.endingSoon || deposit.dueToday) ? 'deposit-urgent' : 'deposit-active');
        row.className = `compact-row ${depositStateClass}`.trim();
        const badgeText = deposit.matured ? 'Vencido' : (deposit.dueToday ? 'Vence hoy' : `Quedan ${deposit.daysRemaining} días`);
        const statusRibbon = deposit.matured ? '<div class="deposit-status-ribbon">VENCIDO</div>' : '';
        row.innerHTML = `
          <div class="compact-row-main">
            ${statusRibbon}
            <div class="compact-row-title">${escapeHtml(deposit.name)}</div>
            <div class="compact-row-subtitle">${escapeHtml(deposit.bank)} · ${deposit.start} → ${deposit.end}</div>
            <div class="deposit-metrics">
              <span>Capital <strong>${formatCurrency(deposit.amount)}</strong></span>
              <span>Interés neto <strong>${formatCurrency(deposit.interest || 0)}</strong></span>
              <span>Total <strong>${formatCurrency(deposit.finalAmount)}</strong></span>
            </div>
          </div>
          <div class="compact-row-actions">
            <span class="badge ${deposit.matured ? 'good' : ((deposit.endingSoon || deposit.dueToday) ? 'warn' : 'info')}">${badgeText}</span>
            ${deposit.matured ? '<button class="btn btn-soft btn-inline" data-close-deposit>Marcar como cobrado</button>' : ''}
            <button class="btn btn-danger btn-inline" data-delete-deposit>Eliminar</button>
          </div>
        `;
        row.querySelector('[data-delete-deposit]').addEventListener('click', async () => {
          const confirmedDelete = confirm(`¿Seguro que quieres eliminar el depósito "${deposit.name}"?`);
          if (!confirmedDelete) return;
          deposits.splice(depositIndex, 1);
          await storageAdapter.saveProfile(state.profile);
          await storageAdapter.saveDeposits(deposits);
          await renderInvestmentsTab();
        });
        row.querySelector('[data-close-deposit]')?.addEventListener('click', async () => {
          const confirmedClose = confirm(`¿Marcar "${deposit.name}" como cobrado? Desaparecerá del patrimonio y su interés neto quedará registrado en ${new Date().getFullYear()}.`);
          if (!confirmedClose) return;
          await closeDeposit(deposit.id);
        });
        list.appendChild(row);
      });
      renderMovementToggle(
        list,
        'deposit-list',
        visibleDeposits.hiddenCount,
        () => renderActiveDepositList(deposits, todayDevice)
      );
    }

    async function renderInvestmentsTab() {
      updateOwnerSelectOptions();
      const allPeriods = state.currentUser ? await storageAdapter.getAllPeriods() : {};
      const housingSummary = calculateHousingSummary(state.profile, allPeriods);
      const housing = state.profile.housing || createEmptyProfile().housing;
      setText('housing-total-price', formatCurrency(housingSummary.totalPrice));
      setText('housing-paid-total', formatCurrency(housingSummary.paid));
      setText('housing-pending-total', formatCurrency(housingSummary.pending));
      setText('housing-progress-percent', formatPercent(housingSummary.percent));
      const bar = document.getElementById('housing-progress-bar');
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, housingSummary.percent))}%`;
      const note = document.getElementById('housing-progress-note');
      if (note) note.textContent = `Entrada: ${formatCurrency(housingSummary.entryPaid)} · Hipoteca acumulada: ${formatCurrency(housingSummary.hipotecaPaid)} · Pagos extraordinarios: ${formatCurrency(housingSummary.extraPaymentsTotal)}`;
      const targetInput = document.getElementById('housing-target-price');
      const entryInput = document.getElementById('housing-entry-paid');
      if (targetInput && document.activeElement !== targetInput) targetInput.value = housing.targetPrice || 1072000;
      if (entryInput && document.activeElement !== entryInput) entryInput.value = housing.entryPaid || 0;
      renderHousingExtraPayments();
      const todayDevice = new Date();
      todayDevice.setHours(12, 0, 0, 0);
      const depositTodayNote = document.getElementById('deposit-today-note');
      if (depositTodayNote) depositTodayNote.textContent = `Cálculo hecho con la fecha actual del dispositivo: ${todayDevice.toLocaleDateString('es-ES')}`;
      const deposits = currentDeposits();
      renderActiveDepositList(deposits, todayDevice);
      renderDepositInterestByYear(deposits);

      const aggregated = await getAggregatedMonthlyInvestments();
      const ownerBreakdownContainer = document.getElementById('investments-by-owner');
      const ownerBreakdown = buildInvestmentOwnerBreakdown(aggregated.rows, deposits);
      if (ownerBreakdownContainer) {
        ownerBreakdownContainer.innerHTML = '';
        if (!ownerBreakdown.length) {
          ownerBreakdownContainer.innerHTML = '<div class="empty-box">Todavía no hay inversiones guardadas para mostrar el acumulado por persona.</div>';
        } else {
          ownerBreakdown.forEach(owner => {
            const ownerSlug = slugify(owner.owner || 'hogar');
            const card = document.createElement('div');
            card.className = 'category-card';
            const salesVisible = getVisibleMovementItems(owner.saleItems || [], `sales-${ownerSlug}`, 3);
            const fundsVisible = getVisibleMovementItems(owner.fundsTransferItems || [], `funds-${ownerSlug}`, 3);
            card.innerHTML = `
              <div class="section-title">
                <div>
                  <h3>${escapeHtml(owner.owner)}</h3>
                  <div class="muted">Total acumulado: ${formatCurrency(owner.total)}</div>
                </div>
              </div>
              <div class="kpi-grid" style="grid-template-columns: repeat(4, minmax(0,1fr)); margin-bottom:16px;">
                <div class="kpi"><div class="kpi-label">Renta fija</div><div class="kpi-value">${formatCurrency(owner.fixed)}</div></div>
                <div class="kpi info"><div class="kpi-label">Renta variable</div><div class="kpi-value">${formatCurrency(owner.funds)}</div></div>
                <div class="kpi info"><div class="kpi-label">Depósitos</div><div class="kpi-value">${formatCurrency(owner.deposits)}</div></div>
                <div class="kpi positive"><div class="kpi-label">Total</div><div class="kpi-value">${formatCurrency(owner.total)}</div></div>
              </div>
              <div class="grid grid-2" style="margin-top:8px;">
                <div class="category-card" style="background: rgba(255,255,255,0.75); border-style: solid; border-color: #d8e1f5;">
                  <div class="section-title"><h3>Renta fija retirada</h3><span class="muted">Retirada manual</span></div>
                  <div class="field-row-3">
                    <div>
                      <label>Importe</label>
                      <input id="toCash-amount-${ownerSlug}" type="number" min="0" step="0.01" placeholder="0" />
                    </div>
                    <div>
                      <label>Nota</label>
                      <input id="toCash-note-${ownerSlug}" type="text" placeholder="Ej. Rescate parcial" />
                    </div>
                    <button class="btn btn-soft" data-add-transfer="${escapeHtml(owner.owner)}" data-transfer-kind="toCash">Retirar renta fija</button>
                  </div>
                  <div class="muted">Disponible ahora: ${formatCurrency(owner.fixed)}</div>
                  <div class="status" id="transfer-status-${ownerSlug}"></div>
                  <div class="compact-list" style="margin-top:12px;" id="sales-list-${ownerSlug}">
                    ${salesVisible.items.length ? salesVisible.items.map(item => `
                      <div class="compact-row">
                        <div class="compact-row-main">
                          <div class="compact-row-title">${formatCurrency(item.amount)}</div>
                          <div class="compact-row-subtitle">${escapeHtml(item.note || 'Retirada de renta fija')} · ${new Date(item.createdAt || Date.now()).toLocaleDateString('es-ES')}</div>
                        </div>
                        <div class="compact-row-actions">
                          <button class="btn btn-danger btn-inline" data-remove-transfer="${item.id}">Eliminar</button>
                        </div>
                      </div>
                    `).join('') : '<div class="list-row"><span class="muted">Todavía no hay retiradas de renta fija registradas.</span></div>'}
                  </div>
                  ${((owner.saleItems || []).length > 3) ? `<div class="compact-toggle-row"><button class="btn btn-secondary btn-inline" data-toggle-list="sales-${ownerSlug}">${salesVisible.expanded ? 'Mostrar menos' : `Ver ${(owner.saleItems || []).length - 3} más`}</button></div>` : ''}
                </div>
                <div class="category-card" style="background: rgba(255,255,255,0.75); border-style: solid; border-color: #d8ebe5;">
                  <div class="section-title"><h3>Renta fija → renta variable</h3><span class="muted">Sin alterar otros bloques</span></div>
                  <div class="field-row-3">
                    <div>
                      <label>Importe</label>
                      <input id="toFunds-amount-${ownerSlug}" type="number" min="0" step="0.01" placeholder="0" />
                    </div>
                    <div>
                      <label>Nota</label>
                      <input id="toFunds-note-${ownerSlug}" type="text" placeholder="Ej. Paso a indexados" />
                    </div>
                    <button class="btn btn-soft" data-add-transfer="${escapeHtml(owner.owner)}" data-transfer-kind="toFunds">Pasar a variable</button>
                  </div>
                  <div class="muted">Disponible ahora: ${formatCurrency(owner.fixed)}</div>
                  <div class="status" id="fund-transfer-status-${ownerSlug}"></div>
                  <div class="compact-list" style="margin-top:12px;" id="funds-list-${ownerSlug}">
                    ${fundsVisible.items.length ? fundsVisible.items.map(item => `
                      <div class="compact-row">
                        <div class="compact-row-main">
                          <div class="compact-row-title">${formatCurrency(item.amount)}</div>
                          <div class="compact-row-subtitle">${escapeHtml(item.note || 'Paso a renta variable')} · ${new Date(item.createdAt || Date.now()).toLocaleDateString('es-ES')}</div>
                        </div>
                        <div class="compact-row-actions">
                          <button class="btn btn-danger btn-inline" data-remove-transfer="${item.id}">Eliminar</button>
                        </div>
                      </div>
                    `).join('') : '<div class="list-row"><span class="muted">Todavía no hay pasos de renta fija a renta variable.</span></div>'}
                  </div>
                  ${((owner.fundsTransferItems || []).length > 3) ? `<div class="compact-toggle-row"><button class="btn btn-secondary btn-inline" data-toggle-list="funds-${ownerSlug}">${fundsVisible.expanded ? 'Mostrar menos' : `Ver ${(owner.fundsTransferItems || []).length - 3} más`}</button></div>` : ''}
                </div>
              </div>
            `;
            ownerBreakdownContainer.appendChild(card);
          });
          ownerBreakdownContainer.querySelectorAll('[data-add-transfer]').forEach(btn => {
            btn.addEventListener('click', () => addInvestmentTransfer(btn.dataset.addTransfer, btn.dataset.transferKind || 'toCash'));
          });
          ownerBreakdownContainer.querySelectorAll('[data-remove-transfer]').forEach(btn => {
            btn.addEventListener('click', () => removeInvestmentTransfer(btn.dataset.removeTransfer));
          });
          ownerBreakdownContainer.querySelectorAll('[data-toggle-list]').forEach(btn => {
            btn.addEventListener('click', () => {
              window.homeflowExpandedLists ||= {};
              const key = btn.dataset.toggleList;
              window.homeflowExpandedLists[key] = !window.homeflowExpandedLists[key];
              renderInvestmentsTab();
            });
          });
        }
      }

      renderHistoricalInvestmentList();

      const historicalFunds = currentHistoricalInvestmentPositions()
        .filter(item => getInvestmentCategory(item.type) === 'funds')
        .reduce((acc, item) => acc + num(item.amount), 0);
      const historicalFixed = currentHistoricalInvestmentPositions()
        .filter(item => getInvestmentCategory(item.type) === 'fixed')
        .reduce((acc, item) => acc + num(item.amount), 0);

      const globalFundsBase = aggregated.rows
        .filter(item => getInvestmentCategory(item.type) === 'funds')
        .reduce((acc, item) => acc + num(item.amount), 0) + historicalFunds;
      const globalFixedBase = aggregated.rows
        .filter(item => getInvestmentCategory(item.type) === 'fixed')
        .reduce((acc, item) => acc + num(item.amount), 0) + historicalFixed;
      const globalFixedSold = getSavedFixedIncomeSalesTotal();
      const globalFixedToFunds = getSavedFixedIncomeTransfersToFundsTotal();
      const globalFunds = globalFundsBase + globalFixedToFunds;
      const globalFixed = Math.max(0, globalFixedBase - globalFixedSold - globalFixedToFunds);
      const globalDeposits = deposits.filter(isDepositActive).reduce((acc, item) => acc + num(item.amount), 0);
      const globalHousing = housingSummary.paid;
      const globalTotal = globalFunds + globalFixed + globalDeposits + globalHousing;
      state.investmentTotals = {
        variable: round2(globalFunds),
        fixed: round2(globalFixed),
        deposits: round2(globalDeposits),
        housing: round2(globalHousing),
        total: round2(globalTotal)
      };

      setText('investments-total-funds', formatCurrency(globalFunds));
      setText('investments-total-fixed', formatCurrency(globalFixed));
      setText('investments-total-deposits', formatCurrency(globalDeposits));
      setText('investments-total-housing', formatCurrency(globalHousing));
      setText('investments-total-all', formatCurrency(globalTotal));
      renderInvestmentsDistributionChart(globalFunds, globalFixed, globalDeposits, globalHousing);
      renderMonthlySummary();
    }

    function renderInvestmentsDistributionChart(funds, fixed, deposits, housing) {
      const labels = ['Renta variable', 'Renta fija', 'Depósitos', 'Vivienda'];
      const colors = ['#2563eb', '#0f766e', '#f59e0b', '#8b5cf6'];
      const rawValues = [round2(funds), round2(fixed), round2(deposits), round2(housing)];
      const total = rawValues.reduce((acc, value) => acc + value, 0);
      const hasAnyValue = rawValues.some(value => value > 0);
      buildChart('investments-distribution-chart', {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: hasAnyValue ? rawValues : [1, 1, 1, 1],
            backgroundColor: colors,
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const value = rawValues[ctx.dataIndex] || 0;
                  const pct = total > 0 ? (value / total) * 100 : 0;
                  return `${ctx.label}: ${formatCurrency(value)} (${formatPercent(pct)})`;
                }
              }
            }
          }
        }
      });

      const legend = document.getElementById('investments-distribution-legend');
      if (!legend) return;
      legend.innerHTML = labels.map((label, index) => {
        const value = rawValues[index] || 0;
        const pct = total > 0 ? (value / total) * 100 : 0;
        return `
          <div class="chart-legend-row">
            <div class="chart-legend-left">
              <span class="chart-legend-dot" style="background:${colors[index]}"></span>
              <div>
                <strong>${label}</strong>
                <div class="muted">${formatCurrency(value)}</div>
              </div>
            </div>
            <div class="chart-legend-values">
              <strong>${formatPercent(pct)}</strong>
              <div class="muted">del total</div>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderProfileConfig() {
      document.getElementById('cfg-fibra').value = state.profile.fixedExpenseLabels.fibra || 'Fibra óptica';
      document.getElementById('cfg-luz').value = state.profile.fixedExpenseLabels.luz || 'Luz';
      document.getElementById('cfg-gas').value = state.profile.fixedExpenseLabels.gas || 'Gas';
      document.getElementById('cfg-agua').value = state.profile.fixedExpenseLabels.agua || 'Agua';
      document.getElementById('cfg-vivienda-alquiler').value = state.profile.fixedExpenseLabels.viviendaAlquiler || 'Alquiler';
      document.getElementById('cfg-vivienda-hipoteca').value = state.profile.fixedExpenseLabels.viviendaHipoteca || 'Hipoteca';
      document.getElementById('cfg-garaje').value = state.profile.fixedExpenseLabels.garaje || 'Garaje';
      updateOwnerSelectOptions();
      updateAdultSelectOptions('adult-extra-income-owner', getActiveAdults());

      renderEditableList('adult-list', state.profile.adults, item => {
        const extras = (item.extraIncomeLabels || []).map(x => x.label).join(' · ');
        return `${item.name} · ${item.mainIncomeLabel || 'Ingreso principal'}${extras ? ` · + ${extras}` : ''}`;
      }, async index => {
        const [removedAdult] = state.profile.adults.splice(index, 1);
        if (removedAdult) {
          state.profile.archivedAdults ||= [];
          state.profile.archivedAdults.push({ ...removedAdult, archivedAt: new Date().toISOString() });
        }
        state.profile.configured = !!state.profile.adults.length;
        state.form = ensurePeriodStructure(state.form, state.profile);
        await storageAdapter.saveProfile(state.profile);
        syncProfileReadyUI();
        renderProfileStatus();
        renderProfileConfig();
        renderMonthlyArea();
        renderMonthlySummary();
        await renderInvestmentsTab();
      });

      const extraIncomeRows = [];
      (state.profile.adults || []).forEach(adult => {
        (adult.extraIncomeLabels || []).forEach(item => extraIncomeRows.push({ adultId: adult.id, id: item.id, label: item.label, adultName: adult.name }));
      });
      renderEditableList('adult-extra-income-list', extraIncomeRows, item => `${item.adultName} · ${item.label}`, async index => {
        const row = extraIncomeRows[index];
        const adult = state.profile.adults.find(a => a.id === row.adultId);
        if (!adult) return;
        adult.extraIncomeLabels = (adult.extraIncomeLabels || []).filter(x => x.id !== row.id);
        await storageAdapter.saveProfile(state.profile);
        renderProfileConfig();
        renderMonthlyArea();
        renderMonthlySummary();
      });

      renderEditableList('child-list', state.profile.children, item => `${item.name}${item.note ? ` · ${item.note}` : ''}`, async index => {
        const [removedChild] = state.profile.children.splice(index, 1);
        if (removedChild) {
          state.profile.archivedChildren ||= [];
          state.profile.archivedChildren.push({ ...removedChild, archivedAt: new Date().toISOString() });
        }
        state.form = ensurePeriodStructure(state.form, state.profile);
        await storageAdapter.saveProfile(state.profile);
        renderProfileConfig();
        renderMonthlyArea();
        renderMonthlySummary();
      });
      renderEditableList('extra-fixed-list', state.profile.extraFixedExpenseLabels || [], item => item.label, async index => {
        const removed = state.profile.extraFixedExpenseLabels.splice(index, 1)[0];
        if (removed && state.form?.expenses?.commonFixedExtra) delete state.form.expenses.commonFixedExtra[removed.id];
        state.form = ensurePeriodStructure(state.form, state.profile);
        await storageAdapter.saveProfile(state.profile);
        renderProfileConfig();
        renderMonthlyArea();
        renderMonthlySummary();
      });
      renderHistoricalInvestmentList();
    }

    function renderEditableList(containerId, list, labelFn, onRemove) {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      if (!list.length) {
        container.innerHTML = '<div class="list-row"><span class="muted">No hay elementos añadidos.</span></div>';
        return;
      }
      list.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'list-row';
        row.innerHTML = `
          <div><strong>${escapeHtml(labelFn(item))}</strong></div>
          <button class="btn btn-danger btn-inline">Eliminar</button>
        `;
        row.querySelector('button').addEventListener('click', () => onRemove(index));
        container.appendChild(row);
      });
    }

    function addAdultFromConfig() {
      const name = document.getElementById('adult-name').value.trim();
      const mainIncomeLabel = document.getElementById('adult-main-income').value.trim() || 'Ingreso principal';
      if (!name) return;
      state.profile.adults.push({ id: slugify(name + '_' + createId('adult')), name, mainIncomeLabel, extraIncomeLabels: [] });
      state.profile.configured = true;
      document.getElementById('adult-name').value = '';
      document.getElementById('adult-main-income').value = '';
      renderProfileConfig();
    }

    function addAdultExtraIncomeFromConfig() {
      const adultId = document.getElementById('adult-extra-income-owner').value;
      const label = document.getElementById('adult-extra-income-label').value.trim();
      if (!adultId || !label) return;
      const adult = state.profile.adults.find(item => item.id === adultId);
      if (!adult) return;
      adult.extraIncomeLabels ||= [];
      adult.extraIncomeLabels.push({ id: createId('income'), label });
      document.getElementById('adult-extra-income-owner').value = '';
      document.getElementById('adult-extra-income-label').value = '';
      renderProfileConfig();
    }

    function addExtraFixedExpenseFromConfig() {
      const label = document.getElementById('cfg-extra-fixed-label').value.trim();
      if (!label) return;
      state.profile.extraFixedExpenseLabels ||= [];
      state.profile.extraFixedExpenseLabels.push({ id: slugify(label + '_' + createId('fixed')), label });
      document.getElementById('cfg-extra-fixed-label').value = '';
      renderProfileConfig();
    }

    function addChildFromConfig() {
      const name = document.getElementById('child-name').value.trim();
      const note = document.getElementById('child-note').value.trim();
      if (!name) return;
      state.profile.children.push({ id: slugify(name + '_' + createId('child')), name, note });
      state.profile.configured = true;
      document.getElementById('child-name').value = '';
      document.getElementById('child-note').value = '';
      renderProfileConfig();
    }

    function updateAdultSelectOptions(selectId, adults) {
      const select = document.getElementById(selectId);
      if (!select) return;
      const current = select.value || '';
      select.innerHTML = `<option value="">Selecciona un adulto</option>${(adults || []).map(a => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join('')}`;
      if ([...select.options].some(opt => opt.value === current)) select.value = current;
    }

    function updateOwnerSelectOptions() {
      ['deposit-owner', 'invest-owner', 'historical-investment-owner'].forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const current = select.value || 'Hogar';
        const options = ['<option value="Hogar">Hogar</option>']
          .concat(getActiveAdults().map(a => `<option value="${escapeHtml(a.name)}">${escapeHtml(a.name)}</option>`));
        if (current && current !== 'Hogar' && !getActiveAdults().some(a => a.name === current)) {
          options.push(`<option value="${escapeHtml(current)}">${escapeHtml(current)} (histórico)</option>`);
        }
        select.innerHTML = options.join('');
        if ([...select.options].some(opt => opt.value === current)) select.value = current;
      });
    }


    function activateTab(tabName) {
      const targetTab = String(tabName || 'mensual');
      document.querySelectorAll('[data-tab]').forEach(b => {
        const active = b.dataset.tab === targetTab;
        b.classList.toggle('active', active);
        b.setAttribute('aria-current', active ? 'page' : 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`tab-${targetTab}`)?.classList.add('active');
      if (targetTab === 'historico') refreshHistoricalView();
      if (targetTab === 'interes') calculateCompound();
      if (targetTab === 'inversiones') renderInvestmentsTab();
      if (targetTab === 'configuracion') renderProfileConfig();
      bindAccordionBehavior(document.getElementById(`tab-${targetTab}`) || document);
      window.requestAnimationFrame(() => {
        Object.values(state.charts || {}).forEach(chart => chart?.resize?.());
      });
    }

    function buildProfilePayloadFromConfiguration() {
      if (document.getElementById('adult-name').value.trim()) addAdultFromConfig();
      if (document.getElementById('child-name').value.trim()) addChildFromConfig();

      return {
        ...structuredClone(state.profile),
        configured: (state.profile.adults || []).length > 0,
        fixedExpenseLabels: {
          fibra: document.getElementById('cfg-fibra').value.trim() || 'Fibra óptica',
          luz: document.getElementById('cfg-luz').value.trim() || 'Luz',
          gas: document.getElementById('cfg-gas').value.trim() || 'Gas',
          agua: document.getElementById('cfg-agua').value.trim() || 'Agua',
          viviendaAlquiler: document.getElementById('cfg-vivienda-alquiler').value.trim() || 'Alquiler',
          viviendaHipoteca: document.getElementById('cfg-vivienda-hipoteca').value.trim() || 'Hipoteca',
          garaje: document.getElementById('cfg-garaje').value.trim() || 'Garaje'
        },
        housing: structuredClone(state.profile.housing || createEmptyProfile().housing),
        updatedAt: new Date().toISOString()
      };
    }

    function buildProfilePayloadFromSetupDraft() {
      if (document.getElementById('setup-adult-name').value.trim()) addAdultToSetupDraft();
      if (document.getElementById('setup-child-name').value.trim()) addChildToSetupDraft();

      const base = createEmptyProfile();
      return {
        ...base,
        ...structuredClone(state.setupDraft),
        configured: (state.setupDraft.adults || []).length > 0,
        fixedExpenseLabels: structuredClone(state.profile.fixedExpenseLabels || base.fixedExpenseLabels),
        fixedIncomePositions: structuredClone(state.profile.fixedIncomePositions || []),
        investmentPositions: structuredClone(state.profile.investmentPositions || []),
        investmentTransfers: structuredClone(state.profile.investmentTransfers || []),
        cashManualEntries: structuredClone(state.profile.cashManualEntries || []),
        extraFixedExpenseLabels: structuredClone(state.profile.extraFixedExpenseLabels || []),
        archivedAdults: structuredClone(state.profile.archivedAdults || []),
        archivedChildren: structuredClone(state.profile.archivedChildren || []),
        deposits: structuredClone(state.profile.deposits || []),
        housing: structuredClone(state.profile.housing || createEmptyProfile().housing),
        updatedAt: new Date().toISOString()
      };
    }


    async function refreshCurrentPeriodAfterProfileChange() {
      state.currentPeriod = getSelectedPeriodId();
      const savedPeriod = await storageAdapter.getPeriod(state.currentPeriod);
      state.form = ensurePeriodStructure(savedPeriod || createEmptyPeriodData(), state.profile);
      state.form.meta ||= {};
      state.form.meta.profileSnapshot = buildProfileSnapshot(state.profile);
      renderMonthlyArea();
      renderMonthlySummary();
      renderPeriodContextNote();
    }

    async function finishFamilySetup(profilePayload, { closeSetup = true, source = 'setup' } = {}) {
      const prepared = structuredClone(profilePayload || createEmptyProfile());
      prepared.adults ||= [];
      prepared.children ||= [];
      prepared.archivedAdults ||= [];
      prepared.archivedChildren ||= [];
      prepared.extraFixedExpenseLabels ||= structuredClone(state.profile.extraFixedExpenseLabels || []);
      prepared.fixedIncomePositions ||= structuredClone(state.profile.fixedIncomePositions || []);
      prepared.investmentPositions ||= structuredClone(state.profile.investmentPositions || []);
      prepared.investmentTransfers ||= structuredClone(state.profile.investmentTransfers || []);
      prepared.cashManualEntries ||= structuredClone(state.profile.cashManualEntries || []);
      prepared.deposits ||= structuredClone(state.profile.deposits || []);
      prepared.housing ||= structuredClone(state.profile.housing || createEmptyProfile().housing);
      prepared.fixedExpenseLabels ||= structuredClone(state.profile.fixedExpenseLabels || createEmptyProfile().fixedExpenseLabels);
      prepared.updatedAt = new Date().toISOString();
      prepared.configured = prepared.adults.length > 0;

      state.profile = normalizeProfile(prepared);
      state.profile.configured = state.profile.adults.length > 0;
      state.setupDraft = structuredClone(state.profile);

      await storageAdapter.saveProfile(state.profile);
      await storageAdapter.saveDeposits(state.profile.deposits || []);

      renderProfileStatus();
      renderProfileConfig();
      updateOwnerSelectOptions();
      await refreshCurrentPeriodAfterProfileChange();
      await renderInvestmentsTab();
      await refreshHistoricalView();
      activateTab('mensual');
      if (closeSetup) closeSetupModal();

      const setupStatus = document.getElementById('setup-status');
      const profileStatus = document.getElementById('profile-status');
      if (source === 'setup' && setupStatus) setupStatus.textContent = 'Familia guardada correctamente.';
      if (source === 'config' && profileStatus) profileStatus.textContent = 'Configuración guardada correctamente.';
      setStatus('Configuración guardada. Ya puedes rellenar tu mes.');
    }

    async function saveProfileFromConfiguration() {
      const profilePayload = buildProfilePayloadFromConfiguration();
      if (!profilePayload.adults.length) {
        const el = document.getElementById('profile-status');
        if (el) el.textContent = 'Añade al menos un adulto que trabaje.';
        return;
      }
      await finishFamilySetup(profilePayload, { closeSetup: false, source: 'config' });
    }

    async function wipeUserData() {
      if (!confirm('¿Seguro que quieres borrar todos los datos del usuario actual?')) return;
      try {
        await storageAdapter.wipeUserBundle(state.currentUser.uid);
      } catch (error) {
        console.error(error);
        alert(error?.message || 'No se pudieron borrar los datos.');
        return;
      }
      state.profile = createEmptyProfile();
      state.form = createEmptyPeriodData();
      renderProfileStatus();
      renderProfileConfig();
      renderMonthlyArea();
      renderMonthlySummary();
      renderPeriodContextNote();
      renderInvestmentsTab();
      refreshHistoricalView();
      openSetupModal();
    }

    function openSetupModal() {
      renderSetupDraftLists();
      document.body.classList.add('modal-open');
      document.getElementById('setup-modal-backdrop').classList.add('show');
    }

    function closeSetupModal() {
      const backdrop = document.getElementById('setup-modal-backdrop');
      if (backdrop) backdrop.classList.remove('show');
      document.body.classList.remove('modal-open');
      const status = document.getElementById('setup-status');
      if (status) status.textContent = '';
    }

    function openSetupModalFromProfile() {
      state.setupDraft = structuredClone(state.profile);
      openSetupModal();
    }

    function addAdultToSetupDraft() {
      const name = document.getElementById('setup-adult-name').value.trim();
      const mainIncomeLabel = document.getElementById('setup-adult-main-income').value.trim() || 'Ingreso principal';
      if (!name) return;
      state.setupDraft.adults ||= [];
      state.setupDraft.adults.push({ id: slugify(name + '_' + createId('adult')), name, mainIncomeLabel, extraIncomeLabels: [] });
      document.getElementById('setup-adult-name').value = '';
      document.getElementById('setup-adult-main-income').value = '';
      renderSetupDraftLists();
    }

    function addAdultExtraIncomeToSetupDraft() {
      const adultId = document.getElementById('setup-adult-extra-income-owner').value;
      const label = document.getElementById('setup-adult-extra-income-label').value.trim();
      if (!adultId || !label) return;
      const adult = (state.setupDraft.adults || []).find(item => item.id === adultId);
      if (!adult) return;
      adult.extraIncomeLabels ||= [];
      adult.extraIncomeLabels.push({ id: createId('income'), label });
      document.getElementById('setup-adult-extra-income-owner').value = '';
      document.getElementById('setup-adult-extra-income-label').value = '';
      renderSetupDraftLists();
    }

    function addChildToSetupDraft() {
      const name = document.getElementById('setup-child-name').value.trim();
      const note = document.getElementById('setup-child-note').value.trim();
      if (!name) return;
      state.setupDraft.children ||= [];
      state.setupDraft.children.push({ id: slugify(name + '_' + createId('child')), name, note });
      document.getElementById('setup-child-name').value = '';
      document.getElementById('setup-child-note').value = '';
      renderSetupDraftLists();
    }

    function renderSetupDraftLists() {
      updateAdultSelectOptions('setup-adult-extra-income-owner', state.setupDraft.adults || []);
      renderEditableList('setup-adult-list', state.setupDraft.adults || [], item => {
        const extras = (item.extraIncomeLabels || []).map(x => x.label).join(' · ');
        return `${item.name} · ${item.mainIncomeLabel || 'Ingreso principal'}${extras ? ` · + ${extras}` : ''}`;
      }, index => {
        state.setupDraft.adults.splice(index, 1);
        renderSetupDraftLists();
      });
      const extraIncomeRows = [];
      (state.setupDraft.adults || []).forEach(adult => {
        (adult.extraIncomeLabels || []).forEach(item => extraIncomeRows.push({ adultId: adult.id, id: item.id, label: item.label, adultName: adult.name }));
      });
      renderEditableList('setup-adult-extra-income-list', extraIncomeRows, item => `${item.adultName} · ${item.label}`, index => {
        const row = extraIncomeRows[index];
        const adult = (state.setupDraft.adults || []).find(a => a.id === row.adultId);
        if (!adult) return;
        adult.extraIncomeLabels = (adult.extraIncomeLabels || []).filter(x => x.id !== row.id);
        renderSetupDraftLists();
      });
      renderEditableList('setup-child-list', state.setupDraft.children || [], item => `${item.name}${item.note ? ` · ${item.note}` : ''}`, index => {
        state.setupDraft.children.splice(index, 1);
        renderSetupDraftLists();
      });
    }

    async function saveSetupDraft() {
      try {
        const profilePayload = buildProfilePayloadFromSetupDraft();
        if (!profilePayload.adults.length) {
          document.getElementById('setup-status').textContent = 'Añade al menos un adulto que trabaje.';
          return;
        }
        await finishFamilySetup(profilePayload, { closeSetup: true, source: 'setup' });
      } catch (error) {
        console.error(error);
        const msg = error?.message ? `No se pudo guardar la familia: ${error.message}` : 'No se pudo guardar la familia.';
        document.getElementById('setup-status').textContent = msg;
      }
    }

    async function exportHistoryExcel() {
      const all = await storageAdapter.getAllPeriods();
      const ordered = Object.entries(all).sort((a, b) => a[0].localeCompare(b[0]));
      if (!ordered.length) return;
      const wb = XLSX.utils.book_new();
      const summaryRows = ordered.map(([period, data]) => {
        const totals = calculateTotalsForData(data);
        return {
          Periodo: formatPeriod(period),
          Ingresos_Totales: round2(totals.totalIncome),
          Gastos_Comunes: round2(totals.commonExpenses),
          Gastos_Personales: round2(totals.personalExpenses),
          Gastos_Hijos: round2(totals.dependentExpenses),
          Gastos_Vida: round2(totals.livingExpenses),
          Inversion_Largo_Plazo: round2(totals.investments),
          Salidas_Totales: round2(totals.totalExpenses),
          Ahorro_Disponible: round2(totals.savings),
          Tasa_Disponible: round2(totals.savingsRate),
          Ahorro_Total: round2(totals.totalSavings),
          Tasa_Ahorro_Total: round2(totals.totalSavingsRate),
          Renta_Fija_Acumulada: round2(totals.fixedIncomeTotal)
        };
      });
      const incomeRows = ordered.flatMap(([period, data]) => buildIncomeRowsForPeriod(period, data));
      const expenseRows = ordered.flatMap(([period, data]) => buildExpenseRowsForPeriod(period, data));
      const investmentRows = ordered.flatMap(([period, data]) => buildInvestmentRowsForPeriod(period, data));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), 'Ingresos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), 'Gastos');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(investmentRows), 'Inversiones');
      XLSX.writeFile(wb, 'HomeFlow3_historico.xlsx');
    }


    async function exportHistoryPDF() {
      const all = await storageAdapter.getAllPeriods();
      const ordered = Object.entries(all).sort((a, b) => a[0].localeCompare(b[0]));
      if (!ordered.length) {
        setStatus('No hay histórico guardado para exportar en PDF.', true);
        return;
      }
      const jsPDFLib = window.jspdf?.jsPDF;
      if (!jsPDFLib) {
        setStatus('No se pudo cargar el generador de PDF.', true);
        return;
      }

      const doc = new jsPDFLib({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const margin = 40;
      let y = 46;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('HomeFlow · Histórico familiar', margin, y);
      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(90, 110, 135);
      doc.text(`Generado el ${new Date().toLocaleString('es-ES')}`, margin, y);

      const summaryRows = ordered.map(([period, data]) => {
        const totals = calculateTotalsForData(data);
        return [
          formatPeriod(period),
          formatCurrency(totals.totalIncome),
          formatCurrency(totals.livingExpenses),
          formatCurrency(totals.investments),
          formatCurrency(totals.savings),
          formatCurrency(totals.totalSavings)
        ];
      });

      doc.autoTable({
        startY: y + 18,
        head: [['Período', 'Ingresos', 'Gastos vida', 'Largo plazo', 'Disponible', 'Ahorro total']],
        body: summaryRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [21, 50, 91] },
        alternateRowStyles: { fillColor: [246, 250, 255] }
      });

      const deposits = currentDeposits().filter(isDepositActive).map(item => [
        item.name,
        item.owner || 'Hogar',
        item.bank || '',
        formatCurrency(item.amount),
        formatCurrency(item.finalAmount)
      ]);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Depósito', 'Titular', 'Entidad', 'Capital', 'Vencimiento estimado']],
        body: deposits.length ? deposits : [['Sin depósitos', '', '', '', '']],
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [15, 118, 110] },
        alternateRowStyles: { fillColor: [242, 251, 248] }
      });

      const investments = currentInvestmentPositions().map(item => [
        item.name,
        item.type || 'Inversión',
        item.owner || 'Hogar',
        item.platform || item.entity || '',
        formatCurrency(item.amount)
      ]);

      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Inversión previa', 'Tipo', 'Titular', 'Entidad', 'Importe']],
        body: investments.length ? investments : [['Sin inversiones previas', '', '', '', '']],
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 6 },
        headStyles: { fillColor: [37, 99, 235] },
        alternateRowStyles: { fillColor: [243, 247, 255] }
      });

      doc.save('HomeFlow3_historico.pdf');
    }

    function buildIncomeRowsForPeriod(period, data) {
      const context = getProfileContextForData(data, state.profile);
      const rows = [];
      context.adults.forEach(adult => {
        const block = data.incomes?.adults?.[adult.id] || { mainFixed: 0, recurring: {}, other: [] };
        if (num(block.mainFixed)) rows.push({ Periodo: formatPeriod(period), Persona: adult.name, Categoria: block.mainLabel || adult.mainIncomeLabel || 'Ingreso principal', Concepto: 'Ingreso principal', Importe: round2(block.mainFixed) });
        Object.values(block.recurring || {}).forEach(item => {
          if (num(item.amount)) rows.push({ Periodo: formatPeriod(period), Persona: adult.name, Categoria: 'Ingreso recurrente', Concepto: item.label || 'Ingreso recurrente', Importe: round2(item.amount) });
        });
        (block.other || []).forEach(item => rows.push({ Periodo: formatPeriod(period), Persona: adult.name, Categoria: 'Otros ingresos puntuales', Concepto: item.name, Importe: round2(item.amount) }));
      });
      return rows;
    }

    function buildExpenseRowsForPeriod(period, data) {
      const context = getProfileContextForData(data, state.profile);
      const rows = [];
      Object.entries(data.expenses.commonFixed || {}).forEach(([key, amount]) => {
        if (!num(amount)) return;
        rows.push({ Periodo: formatPeriod(period), Bloque: 'Común', Subcategoria: context.fixedExpenseLabels[key] || key, Concepto: context.fixedExpenseLabels[key] || key, Importe: round2(amount) });
      });
      Object.entries(data.expenses.commonFixedExtra || {}).forEach(([key, amount]) => {
        if (!num(amount)) return;
        const label = (context.extraFixedExpenseLabels || []).find(item => item.id === key)?.label || key;
        rows.push({ Periodo: formatPeriod(period), Bloque: 'Común', Subcategoria: label, Concepto: label, Importe: round2(amount) });
      });
      (data.expenses.supermarket || []).forEach(item => rows.push({ Periodo: formatPeriod(period), Bloque: 'Común', Subcategoria: 'Supermercado', Concepto: item.name, Importe: round2(item.amount) }));
      (data.expenses.commonOther || []).forEach(item => rows.push({ Periodo: formatPeriod(period), Bloque: 'Común', Subcategoria: 'Otros gastos comunes', Concepto: item.name, Importe: round2(item.amount) }));
      context.adults.forEach(adult => {
        (data.expenses.adults?.[adult.id] || []).forEach(item => rows.push({ Periodo: formatPeriod(period), Bloque: adult.name, Subcategoria: 'Gasto personal', Concepto: item.name, Importe: round2(item.amount) }));
      });
      context.children.forEach(child => {
        (data.expenses.children?.[child.id] || []).forEach(item => rows.push({ Periodo: formatPeriod(period), Bloque: child.name, Subcategoria: item.category, Concepto: item.name, Importe: round2(item.amount) }));
      });
      return rows;
    }

    function buildInvestmentRowsForPeriod(period, data) {
      return (data.expenses.monthlyInvestments || []).map(item => ({ Periodo: formatPeriod(period), Tipo: item.type, Titular: item.owner, Concepto: item.name, Importe: round2(item.amount) }));
    }

    function setText(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    function setValueByStringPath(obj, path, value) {
      const parts = path.split('.');
      const last = parts.pop();
      const target = parts.reduce((acc, part) => acc[part], obj);
      target[last] = value;
    }

    function sumList(list) {
      return (list || []).reduce((acc, item) => acc + num(item.amount), 0);
    }

    function num(value) {
      return parseFloat(value || 0) || 0;
    }

    function round2(value) {
      return Math.round((num(value) + Number.EPSILON) * 100) / 100;
    }

    function formatCurrency(value, withSymbol = true) {
      const formatted = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num(value));
      return withSymbol ? `${formatted} €` : formatted;
    }

    function formatPercent(value) {
      return `${new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(num(value))} %`;
    }

    function formatPeriod(periodId) {
      const [year, month] = periodId.split('-');
      return `${monthNames[Number(month) - 1]} ${year}`;
    }

    function formatPeriodShort(periodId) {
      const [year, month] = periodId.split('-');
      return `${monthNames[Number(month) - 1].slice(0,3)} ${String(year).slice(2)}`;
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function init() {
      populatePeriodSelectors();
      initTheme();
      bindTabs();
      bindActions();
      bindAccordionBehavior();
      calculateCompound();
      authAdapter.init();
    }

    init();
