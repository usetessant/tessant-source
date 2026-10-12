import { Contract, JsonRpcProvider } from "ethers";
const rpc=new JsonRpcProvider('https://bsc-dataseed.bnbchain.org',56,{staticNetwork:true});
const id='0x7fe248d8459a88e50e8582c71219edbce1079437e58190aeab41ac503694f0a5';
const c=new Contract('0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C',[
 'function idToMarketParams(bytes32) view returns(address loanToken,address collateralToken,address oracle,address irm,uint256 lltv)',
 'function market(bytes32) view returns(uint128 totalSupplyAssets,uint128 totalSupplyShares,uint128 totalBorrowAssets,uint128 totalBorrowShares,uint128 lastUpdate,uint128 fee)',
 'function providers(bytes32,address) view returns(address)', 'function brokers(bytes32) view returns(address)',
 'function isWhiteList(bytes32,address) view returns(bool)','function paused() view returns(bool)','function minLoanValue() view returns(uint256)'
],rpc);
const p=await c.idToMarketParams(id);
console.log({params:Array.from(p).map(String), market:Array.from(await c.market(id)).map(String),provider:await c.providers(id,p.collateralToken),broker:await c.brokers(id),whitelisted:await c.isWhiteList(id,'0x1111111111111111111111111111111111111111'),paused:await c.paused(),minLoanValue:(await c.minLoanValue()).toString()});
