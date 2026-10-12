import CreditPlanner from "@/components/CreditPlanner";
export const metadata={title:"Economics calculator"};
export default function PlannerPage(){return <><section className="app-hero"><div className="shell"><h1>Size the debt around the yield.</h1><p>Illustrative calculations only. Use the mainnet app to open or manage an actual position.</p><a className="button secondary" href="/app">Open mainnet app</a></div></section><section className="planner-section"><div className="shell"><CreditPlanner/></div></section></>;}
