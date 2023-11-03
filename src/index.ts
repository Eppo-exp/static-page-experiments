window["EppoFeatureSwitchHelper"] = window["EppoFeatureSwitchHelper"] || {
    _redirKey: '_stsgnoredir',
    _configNameKey: '_configname',

    addEppoSdk: function (apiKey, nonce) {
        // why does it need to be added can't it just be a dependency?

        const script = document.createElement('script');
        if (nonce) {
            script.nonce = nonce;
        }
        script.src = 'https://cdn.jsdelivr.net/npm/eppo-js';
        script.addEventListener('load', () => {
            EppoFeatureSwitchHelper._sdkLoaded = true;
            EppoFeatureSwitchHelper.setupEppoSdk(apiKey);
        });
        document.head.appendChild(script);
    },

    getStableID: function () {
        const key = 'EPPO_LOCAL_STORAGE_STABLE_ID';
        let sid = window.localStorage ? window.localStorage.getItem(key) : null;
        if (!sid) {
            sid = crypto.randomUUID();
            if (window.localStorage) {
                window.localStorage.setItem(key, sid);
            }
        }
        return sid;
    },

    getAssignment: async function (apiKey, flagKey) {
        // todo: use eppo js sdk

    },

    performRedirect: function (apiKey, expIds) {
        const currentUrl = new URL(window.location.href);

        // Force no redir
        if (currentUrl.searchParams.get(EppoFeatureSwitchHelper._redirKey)) {
            EppoFeatureSwitchHelper.resetBody();
            return;
        }

        this.getExperimentConfigWithFallback(apiKey, expIds, layerId)
            .then(config => {
                const url = config?.value?.page_url;
                if (url) {
                    EppoFeatureSwitchHelper.redirectToUrl(apiKey, url, config);
                    return;
                } else {
                    // Could be in pre-start mode
                    EppoFeatureSwitchHelper.resetBody();
                }
            })
            .catch((reason) => {
                console.log(reason);
                EppoFeatureSwitchHelper.resetBody();
            })
            .finally(() => {
            });
    },

    redirectToUrl: function (apiKey, url, config) {
        const currentUrl = new URL(window.location.href);
        const newUrl = new URL(url, window.location.href);

        let cp = currentUrl.pathname;
        cp = cp.endsWith('/') ? cp.substring(0, cp.length - 1) : cp;
        let np = newUrl.pathname;
        np = np.endsWith('/') ? np.substring(0, np.length - 1) : np;

        if (cp === np) {
            EppoFeatureSwitchHelper.resetBody();
            EppoFeatureSwitchHelper.setupEppoSdk(apiKey);
            return;
        }
        currentUrl.searchParams.forEach((value, key) => {
            // Only set search params that don't already exist
            if (!newUrl.searchParams.get(key)) {
                newUrl.searchParams.set(key, value);
            }
        });
        newUrl.searchParams.set(EppoFeatureSwitchHelper._redirKey, 1);
        const excludeConfigNameInUrl = config?.value?.excludeConfigNameInUrl;
        if (!excludeConfigNameInUrl) {
            newUrl.searchParams.set(
                EppoFeatureSwitchHelper._configNameKey,
                config?.name ?? '',
            );
        }
        window.location.replace(newUrl.href);
    },

    resetBody: function () {
        EppoFeatureSwitchHelper._redirectFinished = true;
        const sbpd = document.getElementById('__sbpd');
        if (sbpd) {
            sbpd.parentElement.removeChild(sbpd);
        }
    },

    setupEppoSdk: function (apiKey) {
        if (!window['eppo']) {
            return;
        }
        if (!EppoFeatureSwitchHelper._redirectFinished || !EppoFeatureSwitchHelper._sdkLoaded) {
            return;
        }
        if (!window.eppo.instance) {
            eppo.initialize(apiKey);
        }
    },
}

if (document.currentScript && document.currentScript.src) {
    const url = new URL(document.currentScript.src);
    const apiKey = url.searchParams.get('apikey');
    const expId = url.searchParams.get('expid');

    if (apiKey && expId) {
        document.write('<style id="__sbpd">body { display: none; }</style>\n');
        EppoFeatureSwitchHelper.addEppoSdk(apiKey, document.currentScript.nonce);
        EppoFeatureSwitchHelper.performRedirect(apiKey, [expId]);
    }
}