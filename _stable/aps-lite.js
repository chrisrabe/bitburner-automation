/**
 * Auto purchase server (lite version)
 * Only cares about purchasing the server
 * Does not deploy scripts
 * @param {NS} ns 
 * **/
 export async function main(ns) {
	ns.disableLog("ALL");
	var homeServ = "home";
	var pRam = 8; // purchased ram
	var servPrefix = "pserv-";

	var maxRam = ns.getPurchasedServerMaxRam();
	var maxServers = ns.getPurchasedServerLimit();

	function canPurchaseServer() {
		return ns.getServerMoneyAvailable(homeServ) > ns.getPurchasedServerCost(pRam);
	}

	async function waitForMoney() {
		while (!canPurchaseServer()) {
			await ns.sleep(10000); // wait 10s
		}
	}

	async function upgradeServer(server) {
		var sRam = ns.getServerMaxRam(server);
		if (sRam < pRam) {
			await waitForMoney();
			ns.killall(server);
			ns.deleteServer(server);
			ns.purchaseServer(server, pRam);
			ns.print(`WARN ⬆️ UPGRADE ${server} @ ${pRam}GB`);
		}
	}

	async function purchaseServer(server) {
		await waitForMoney();
		ns.purchaseServer(server, pRam);
		ns.print(`WARN 💰 PURCHASE ${server} @ ${pRam}GB`);
	}

	async function autoUpgradeServers() {
		var i = 0;
		while (i < maxServers) {
			var server = servPrefix + i;
			if (ns.serverExists(server)) {
				await upgradeServer(server);
				++i;
			} else {
				await purchaseServer(server);
				++i;
			}
		}
	}

	while (true) {
		ns.print(`INFO Upgrading all servers to ${pRam}GB`);
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