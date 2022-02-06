/** @param {NS} ns **/
export async function main(ns) {
	let recovered = 0;

	function getOwnedStocks() {
		const stockSymbols = ns.stock.getSymbols();
		const stocks = [];
		for (const sym of stockSymbols) {
			const pos = ns.stock.getPosition(sym);
			const stock = {
				sym,
				longShares: pos[0],
				shortShares: pos[2],
			};
			stocks.push(stock);
		}
		return stocks;
	}

	function sellStocks(stocks) {
		for (const stock of stocks) {
			if (stock.longShares > 0) {
				const salePrice = ns.stock.sell(stock.sym, stock.longShares);
				recovered += salePrice;
			}
			if (stock.shortShares > 0) {
				const salePrice = ns.stock.sell(stock.sym, stock.shortShares);
				recovered += salePrice;
			}
		}
	}

	const homeServ = "home";
	const trader = "diamond-hands.js";

	if (ns.scriptRunning(trader, homeServ)) {
		ns.scriptKill(trader, homeServ);
	}

	const stocks = getOwnedStocks();
	sellStocks(stocks);

	ns.tprint("Getting ready to GTFO? Before you go, Please ensure that:");
	ns.tprint("\t- You use up your money wherever possible");
	ns.tprint("\t- Close all positions in the stock market");
	ns.tprint("\t- Check augments from all factions");
	ns.tprint("\t- Back up all your scripts");
	ns.tprint("");
	ns.tprint(`Total money recovered : ${ns.nFormat(recovered, '$0a')}`);

	// Close all home scripts
	ns.killall();
}