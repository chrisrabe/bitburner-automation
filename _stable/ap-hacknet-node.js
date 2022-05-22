/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	const { hacknetNodes } = ns.formulas;
	const { hacknet } = ns;

	const {
		MaxCores,
		MaxLevel,
		MaxRam
	} = hacknetNodes.constants();

	const maxValues = {
		cores: MaxCores,
		level: MaxLevel,
		ram: MaxRam
	};

	const upgradeCostFunc = {
		cores: hacknet.getCoreUpgradeCost,
		level: hacknet.getLevelUpgradeCost,
		ram: hacknet.getRamUpgradeCost
	};

	const maxNodes = hacknet.maxNumNodes();

	function getUpgradeInfo(index, stats, field) {
		if (stats[field] === maxValues[field]) {
			return undefined; // Already maxed out
		}
		const getCost = (node) => upgradeCostFunc[field](node, 1);
		const cost = getCost(index);
		const newStats = { ...stats };
		newStats[field] += 1;
		const gain = hacknetNodes.moneyGainRate(newStats.level, newStats.ram, newStats.cores);
		const roi = gain / cost;
		return {
			cost,
			roi,
			gain
		}
	}

	function getPurchaseInfo() {
		if (hacknet.numNodes() === maxNodes) {
			return undefined; // Can't purchase anymore
		}
		const cost = hacknet.getPurchaseNodeCost();
		const gain = hacknetNodes.moneyGainRate(1, 1, 1);
		const roi = gain / cost;
		return {
			cost,
			roi,
			gain
		};
	}

	function getOwnedHacknetNodes() {
		const nodes = [];
		for (let i = 0; i < hacknet.numNodes(); i++) {
			const stats = hacknet.getNodeStats(i);
			const nodeInfo = { ...stats, id: i };
			for (const field of Object.keys(upgradeCostFunc)) {
				nodeInfo[`${field}Upgrade`] = getUpgradeInfo(i, stats, field);
			}
			nodes.push(nodeInfo);
		}
		return nodes;
	}

	function getBestNodesToUpgrade(nodes) {
		const nodesToUpgrade = {
			cores: undefined,
			ram: undefined,
			level: undefined
		};
		for (const node of nodes) {
			for (const field of Object.keys(nodesToUpgrade)) {
				const upgradeInfo = node[`${field}Upgrade`];
				if (!upgradeInfo) {
					continue;
				}

				if (nodesToUpgrade[field]) {
					// Ensure that we're taking the one with largest
					if (nodesToUpgrade[field].roi < upgradeInfo.roi) {
						nodesToUpgrade[field] = {
							node: node.id,
							roi: upgradeInfo.roi,
							cost: upgradeInfo.cost
						}
					}
				} else {
					nodesToUpgrade[field] = {
						node: node.id,
						roi: upgradeInfo.roi,
						cost: upgradeInfo.cost
					}
				}
			}
		}
		return nodesToUpgrade;
	}

	function toReadableMoney(cost) {
		return cost.toLocaleString("en-US", { style: "currency", currency: "USD" });
	}

	async function waitForMoney(cost) {
		while (ns.getServerMoneyAvailable("home") < cost) {
			await ns.sleep(10000); // wait 10s
		}
	}

	async function purchaseNewNode(cost) {
		await waitForMoney(cost)
		const dollars = toReadableMoney(cost);
		ns.print("ERROR\tnode-new : PURCHASE_NODE\t@ " + dollars);
		hacknet.purchaseNode();
	}

	async function upgradeNode(field, node, cost) {
		await waitForMoney(cost);
		const dollars = toReadableMoney(cost);
		switch (field) {
			case "cores":
				ns.print("INFO\tnode-" + node + " : UPGRADE_CORES\t@ " + dollars);
				hacknet.upgradeCore(node, 1);
				break;
			case "level":
				ns.print("SUCCESS\tnode-" + node + " : UPGRADE_LEVEL\t@ " + dollars);
				hacknet.upgradeLevel(node, 1);
				break;
			case "ram":
				ns.print("WARN\tnode-" + node + " : UPGRADE_RAM\t@ " + dollars);
				hacknet.upgradeRam(node, 1);
				break;
			default:
				return;
		}
	}

	async function doAction(action, nodesToUpgrade, purchaseInfo) {
		const { cores, level, ram } = nodesToUpgrade;
		switch (action) {
			case "purchase":
				await purchaseNewNode(purchaseInfo.cost);
				break;
			case "upgradeCore":
				await upgradeNode("cores", cores.node, cores.cost);
				break;
			case "upgradeLevel":
				await upgradeNode("level", level.node, level.cost);
				break;
			case "upgradeRam":
				await upgradeNode("ram", ram.node, ram.cost);
				break;
			default:
				return; // do nothing
		}
	}

	async function doNextAction(purchaseInfo, nodesToUpgrade) {
		const actionROI = {
			purchase: purchaseInfo?.roi,
			upgradeCore: nodesToUpgrade?.cores?.roi,
			upgradeLevel: nodesToUpgrade?.level?.roi,
			upgradeRam: nodesToUpgrade?.ram?.roi
		};
		const allROI = Object.values(actionROI).filter(roi => roi);
		if (allROI.length < 1) {
			ns.exit(); // all maxed out
		}
		const maxROI = Math.max(...allROI);
		for (const action of Object.keys(actionROI)) {
			const value = actionROI[action];
			if (value === maxROI) {
				await doAction(action, nodesToUpgrade, purchaseInfo);
				break;
			}
		}
	}

	while (true) {
		const nodes = getOwnedHacknetNodes();
		const nodesToUpgrade = getBestNodesToUpgrade(nodes);
		const purchaseInfo = getPurchaseInfo();
		await doNextAction(purchaseInfo, nodesToUpgrade);
		await ns.sleep(1000);
	}
}
