/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	const prodBudget = ns.args[0]; // combined design and marketing budget

	if (!prodBudget) {
		throw new Error("Production budget not defined.");
	}

	const MAX_PRODUCTS = 3;
    const DEMAND_THRESHOLD = 0.2;
	const DEFAULT_CITY = "Sector-12";

	const researchNames = {
		marketTA1: 'Market-TA.I',
		marketTA2: 'Market-TA.II'
	}

	const corp = eval("ns.corporation");

	const getProducts = (division) => {
		const divisionName = division.name;
		return division.products.map(prodId => {
			const rawProd = corp.getProduct(divisionName, prodId);
			return {
				competition: rawProd.cmp,
				developmentProgress: rawProd.developmentProgress,
				demand: rawProd.dmd,
				name: rawProd.name,
				prodCost: rawProd.pCost,
				sellCost: rawProd.sCost,
				cityData: Object.keys(rawProd.cityData).map(city => {
					const data = rawProd.cityData[city];
					return {
						city,
						inventory: data[0],
						amtProduced: data[1],
						amtSold: data[2]
					}
				})
			}
		});
	}

	const isDevelopingProduct = (products) =>
		products.some(prod => Math.round(prod.developmentProgress) < 100);

	const shouldDevelopProduct = (products) =>
		products.length < MAX_PRODUCTS ||
		products.some(prod => {
			const pDemand = prod.demand;
			const pComp = prod.competition;

			// demand higher the competition
			if (pDemand > pComp) {
				return false;
			}

			const diff = Math.abs(pDemand - pComp);

			// difference between competition and demand is less than 20% of demand
			if (diff < (pDemand * DEMAND_THRESHOLD)) {
				return false;
			}

			return true;
		})

	const getProductToDiscontinue = (products) => {
		let highestDiff = 0;
		let prodToDiscontinue = undefined;

		for (const prod of products) {
			if (prod.demand > prod.competition) {
				continue; // still producing money
			}
			const diff = Math.abs(prod.demand - prod.competition);
			if (diff > highestDiff) {
				highestDiff = diff;
				prodToDiscontinue = prod;
			}
		}

		return prodToDiscontinue;
	}

	const getMostProductiveCity = (product) => {
		let highestProd = 0;
		let bestCity = undefined;

		for (const city of product.cityData) {
			if (city.amtProduced > highestProd) {
				highestProd = city.amtProduced;
				bestCity = city;
			}
		}

		return bestCity.city;
	}

	const sellProduct = (divisionName, cityName, productName) => {
		corp.sellProduct(divisionName, cityName, productName, "MAX", "MP", true);

		if (corp.hasResearched(divisionName, researchNames.marketTA1)) {
			corp.setProductMarketTA1(divisionName, productName, true);
		}

		if (corp.hasResearched(divisionName, researchNames.marketTA2)) {
			corp.setProductMarketTA2(divisionName, productName, true);
		}
	}

	const refineProduct = (division, city, product, designBudget, marketBudget) => {
		const divisionName = division.name;
		const productName = product.name;

		corp.discontinueProduct(divisionName, productName);
		corp.makeProduct(divisionName, city, productName, designBudget, marketBudget);
		sellProduct(divisionName, city, productName);
	}

	const createProduct = (division, productName, designBudget, marketBudget) => {
		const divisionName = division.name;
		corp.makeProduct(divisionName, DEFAULT_CITY, productName, designBudget, marketBudget);
		sellProduct(divisionName, DEFAULT_CITY, productName);
	}

	const developProduct = (division, products) => {
		const budget = prodBudget / 2;

		if (products.length === MAX_PRODUCTS) {
			const lamestProduct = getProductToDiscontinue(products);
			const bestCity = getMostProductiveCity(lamestProduct);
			ns.print(`WARN\t${division.name}: Refining ${lamestProduct.name} @ ${bestCity}`);
			refineProduct(division, bestCity, lamestProduct, budget, budget);
		} else {
			const productName = `prod-${products.length}`;
			ns.print(`INFO\t${division.name}: Developing ${productName} @ ${DEFAULT_CITY}`);
			createProduct(division, productName, budget, budget);
		}
	}

	const canDevelopProduct = (business) => business.funds * 0.5 > prodBudget;

	const interval = 5000; // 5s

	while (true) {
		const business = corp.getCorporation();

		for (const div of business.divisions) {
			const products = getProducts(div);
			if (isDevelopingProduct(products)) {
				ns.print(`ERROR\t${div.name}: Currently developing a product`);
				continue;
			}

			if (canDevelopProduct(business) && shouldDevelopProduct(products)) {
				developProduct(div, products);
			}

			ns.print(`SUCCESS\t${div.name}: All products are generating money`);
		}
		await ns.sleep(interval);
	}

}