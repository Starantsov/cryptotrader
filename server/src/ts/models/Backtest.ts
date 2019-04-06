import { ObjectID } from "mongodb";
import { Edm, odata } from "odata-v4-server";
import { BacktestRow } from "./BacktestRow";

export class Backtest {
  @Edm.Key
  @Edm.Computed
  @Edm.String
  public _id: ObjectID

  @Edm.String
  public name: string

  @Edm.String
  public strategyId: ObjectID

  @Edm.ForeignKey("backtestId")
  @Edm.Collection(Edm.EntityType(Edm.ForwardRef(() => BacktestRow)))
  Rows: BacktestRow[]

  @Edm.Action
  async update(@odata.result result: Backtest) {
    console.log(result);
  }

  constructor (jsonData: any) {
    Object.assign(this, jsonData);
  }
}
