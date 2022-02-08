/**
 * Auto purchase server (lite version)
 * Only cares about purchasing the server
 * Does not deploy scripts
 * @param {NS} ns 
 * **/
 export async function main(ns) {
	var homeServ = "home";
	var pRam = 8; // purchased ram
	var servPrefix = "pserv-";

	var maxRam = ns.getPurchasedServerMaxRam();
	var maxServers = ns.getPurchasedServerLimit();

	function canPurchaseServer() {
		return ns.getServerMoneyAvailable(homeServ) > ns.getPurchasedServerCost(pRam);
	}

	async function upgradeServer(server) {
		var sRam = ns.getServerMaxRam(server);
		if (sRam < pRam) {
			while (!canPurchaseServer()) {
				await ns.sleep(10000); // wait 10s
			}
			ns.killall(server);
			ns.deleteServer(server);
			ns.purchaseServer(server, pRam);
		}
	}

	async function purchaseServer(server) {
		while (!canPurchaseServer()) {
			await ns.sleep(10000); // wait 10s
		}
		ns.purchaseServer(server, pRam);
	}

	async function autoUpgradeServers() {
		var i = 0;
		while (i < maxServers) {
			var server = servPrefix + i;
			if (ns.serverExists(server)) {
				ns.print("Upgrading server " + server + " to " + pRam + "GB");
				await upgradeServer(server);
				++i;
			} else {
				ns.print("Purchasing server " + server + " at " + pRam + "GB");
				await purchaseServer(server, pRam);
				++i;
			}
		}
	}

	while (true) {
		await autoUpgradeServers();
		ns.tprintf("SUCCESS Upgraded all servers to " + pRam + "GB");
		if (pRam === maxRam) {
			break;
		}
		// move up to next tier
		var newRam = pRam * 2;
		if (newRam > maxRam) {
			pRam = maxRam;
		} else {
			pRam = newRam;
		}
	}
}