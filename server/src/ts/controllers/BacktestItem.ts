import {Collection, ObjectID} from "mongodb";
import {createQuery} from "odata-v4-mongodb";
import {ODataController, Edm, odata, ODataQuery} from "odata-v4-server";
import {BacktestItem} from "../models/BacktestItem";
import connect from "../connect";

const collectionName = "BacktestItem";

@odata.type(BacktestItem)
@Edm.EntitySet("BacktestItems")
export class BacktestItemController extends ODataController {
  @odata.GET
  async find(@odata.query query: ODataQuery): Promise<BacktestItem[]> {
    //console.log(query);
    const db = await connect();
    const mongodbQuery = createQuery(query);
    if (typeof mongodbQuery.query._id == "string") mongodbQuery.query._id = new ObjectID(mongodbQuery.query._id);
    if (typeof mongodbQuery.query.backtestId == "string") mongodbQuery.query.backtestId = new ObjectID(mongodbQuery.query.backtestId);
    
    let result = typeof mongodbQuery.limit == "number" && mongodbQuery.limit === 0 ? [] : await db.collection(collectionName)
      .find(mongodbQuery.query)
      .project(mongodbQuery.projection)
      .skip(mongodbQuery.skip || 0)
      .limit(mongodbQuery.limit || 0)
      .sort(mongodbQuery.sort)
      .toArray();
    if (mongodbQuery.inlinecount) {
      (<any>result).inlinecount = await db.collection(collectionName)
        .find(mongodbQuery.query)
        .project(mongodbQuery.projection)
        .count(false);
    }
    return result;
  }

  //TODO добавить обработку OPTIONS

  @odata.GET
  async findOne(@odata.key key: string, @odata.query query: ODataQuery): Promise<BacktestItem> {
    const db = await connect();
    const mongodbQuery = createQuery(query);
    let keyId;
    try { keyId = new ObjectID(key); } catch(err) { keyId = key; }
    return db.collection(collectionName).findOne({_id: keyId}, {
      fields: mongodbQuery.projection
    });
  }

  @odata.POST
  async insert(@odata.body data: any): Promise<BacktestItem> {
    //console.log(data);
    const db = await connect();
    if (typeof data.backtestId == "string") data.backtestId = new ObjectID(data.backtestId);
    return await db.collection(collectionName).insertOne(data).then((result) => {
      data._id = result.insertedId;
      //получить и сразу записать очередной номер по счетчику
      //присвоить
      return data;
    });
  }

  @odata.PUT
  async upsert(@odata.key key: string, @odata.body data: any, @odata.context context: any): Promise<BacktestItem> {
    const db = await connect();
    if (data._id) delete data._id;
    let keyId;
    try { keyId = new ObjectID(key); } catch(err) { keyId = key; }
    return await db.collection(collectionName).updateOne({_id: keyId}, data, {
      upsert: true
    }).then((result) => {
      data._id = result.upsertedId
      return data._id ? data : null;
    });
  }

  @odata.PATCH
  async update(@odata.key key: string, @odata.body delta: any): Promise<number> {
    const db = await connect();
    if (delta._id) delete delta._id;
    let keyId;
    try { keyId = new ObjectID(key); } catch(err) { keyId = key; }
    //отправить в RMQ
    //а где-то прослушать, вроде бы непосредственно в UI

    //await db.collection('SalerOrder')

    /*db.collection('SalerOrder').aggregate([
      {
        $match: {
          _id: 
        }
      },
      {
        $group: {
          _id: null,
          total : {
            $sum: "$total"
          }
        }
      }
    ], function(err, result) {
      if (err) return console.dir(err)
      console.log(result);
    });*/

    //пример вычисления зависимого поля
    await db.collection(collectionName).findOne({_id: keyId}).then(result => {
      if (!delta.quantity) delta.quantity = result.quantity;
      if (!delta.price) delta.price = result.price;
      delta.total = delta.quantity * delta.price;
    });

    return await db.collection(collectionName).updateOne({_id: keyId}, {$set: delta})
      .then(result => {
        return result.modifiedCount;
      });//BUG modifiedCount не существует, вместо этого nModified
  }

  @odata.DELETE
  async remove( @odata.key key: string): Promise<number> {
    const db = await connect();
    let keyId;
    try { keyId = new ObjectID(key); } catch(err) { keyId = key; }
    return await db.collection(collectionName).deleteOne({_id: keyId}).then(result => result.deletedCount);
  }
}