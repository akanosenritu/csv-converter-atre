import './App.css'
import {useState} from "react"
import {useDropzone} from "react-dropzone"
import {parse} from "csv-parse/lib/sync"
import {stringify} from "csv-stringify/lib/sync"
import janData1211 from "./jan1211.json"
import janData1216 from "./jan1216.json"
import iconv from "iconv-lite"

type Datum = {
  "返品数": string,
  "販売点数": string,
  "商品コード": string,
  "商品番号"?: string,
  "販売点数 (net)"?: string,
}


// promisified fileReader, this was needed to specify 
// the encoding of the input file (shift-jis).
// source: https://blog.shovonhasan.com/using-promises-with-filereader/
const myReadFileAsText = (inputFile: File, encoding: string): Promise<string> => {
  const temporaryFileReader = new FileReader();

  return new Promise((resolve, reject) => {
    temporaryFileReader.onerror = () => {
      temporaryFileReader.abort();
      reject(new DOMException("Problem parsing input file."));
    };

    temporaryFileReader.onload = () => {
      resolve(temporaryFileReader.result as string);
    };
    temporaryFileReader.readAsText(inputFile, encoding);
  })
}

const calculateItemsSold = (datum: {"販売点数": string, "返品数": string}) => {
  if (datum["販売点数"] && datum["返品数"]) return (parseFloat(datum["販売点数"]) - parseFloat(datum["返品数"])).toString(10)
  return ""
}

const readCSV = async (file: File) => {
  const text = await myReadFileAsText(file, "Shift-jis")

  // parse the data with csv library
  const data: {[key: string]: string}[] = parse(text, {columns: true})
  return data as Datum[]
}

const addItemNumber = (datum: Datum, janDataSource: "1211" | "1216") => {
  const janData = janDataSource === "1211" ? janData1211: janData1216
  const newDatum = {...datum}
  newDatum["商品番号"] = "Not found"
  newDatum["販売点数 (net)"] = "Error" 
  // @ts-ignore
  if (janData[datum["商品コード"]]) {
    // @ts-ignore
    newDatum["商品番号"] = janData[datum["商品コード"]].toString()
  }
  return newDatum
}

const convertCSV = async (file: File, janData: "1211" | "1216") => {
  const data = await readCSV(file)

  // add "Item code" to the data by looking up final.json
  // calculate the actual number of items sold 
  const modifiedData = data.map(datum => {
    const newDatum = addItemNumber(datum, janData)
    newDatum["販売点数 (net)"] = calculateItemsSold(datum)
    return newDatum
  })

  // generate required item numbers
  // before 1216: 265 items
  // after 1216: 290 items
  const numberOfItems = janData === "1211"? 265: 290
  const requiredItemNumbers = Array(numberOfItems).fill(0).map((elem, index) => index+1)
  
  // insert placeholders in the place of an item if no data was provided by POS 
  const tempData: any[] = []
  for (const num of requiredItemNumbers) {
    const index = modifiedData.findIndex(datum => datum["商品番号"] === num.toString())
    if (index === -1) tempData.push({"商品番号": num.toString()})
    else tempData.push(modifiedData[index])
  }

  // items that don't have an item-number associated with them
  const notFound = modifiedData.filter(datum => datum["商品番号"] === "Not found")

  // joint them
  const finalData = tempData.concat(notFound)

  return finalData
}

const stringifyCSV = (data: Datum[]) => {
  return stringify(data, {
    header: true,
    columns: [{key: "商品番号"}, {key: "商品コード"}, {key: "商品名"}, {key: "部門名"}, {key: "純売上"}, {key: "純売上(税抜)"}, {key: "消費税"}, {key: "原価"}, {key: "純売上構成比"}, {key: "販売点数"}, {key: "返品数"}, {key: "販売点数 (net)"}, {key: "販売点数構成比"}, {key: "在庫数"}]
  })
}



function App() {
  // due to the addition of items on 12/16, two states are now used.
  // one is for before 12/1
  const [convertedData2, setConvertedData2] = useState<Datum[]|null>(null)

  const filterFiles = (acceptedFiles: File[]) => {
    return acceptedFiles.length === 0? null: acceptedFiles[0]
  }
  const {acceptedFiles, getRootProps, getInputProps} = useDropzone({
    onDrop: (files) => {
      const file = filterFiles(files)
      if (file) {
        convertCSV(file, "1216")
          .then(data => setConvertedData2(data))

      }   
    }    
  })
  const file = acceptedFiles.length === 0? null: acceptedFiles[0]
  
  const downloadCSV = (csvData: string) => {
    const aElement = document.createElement("a")
    const tempFile = new Blob([iconv.encode(csvData, "Shift_JIS")], {type: "text/plain"})
    aElement.href = URL.createObjectURL(tempFile)
    aElement.download = file? file.name : "newfile.csv"
    document.body.appendChild(aElement)    
    aElement.click()
  }

  const onClickDownloadButton1216 = async () => {
    if (convertedData2) {
      downloadCSV(stringifyCSV(convertedData2))
    }
  }
  const onClickCopyButton1216 = async () => {
    if (convertedData2) {
      // the last element is excluded because it is the sum.
      const salesData = convertedData2.map(datum => calculateItemsSold(datum)).slice(0, -1)
      navigator.clipboard.writeText(salesData.join("\n"))
    }
  }

  return (
    <div className="App">
      <div style={{border: "3px dotted black", borderRadius: 20, margin: 20}}>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <p>
            ここにファイルをドロップするか、クリックしてファイルを選択してください。
          </p>
        </div>
      </div>
      <div style={{display: "flex", margin: 5}}>
        <div style={{width: "50%"}}>売上管理表1216更新 .xlsx 用</div>
        <div style={{display: "flex", justifyContent: "space-around", width: "50%"}}>
          <button onClick={onClickDownloadButton1216} disabled={!convertedData2}>ダウンロード</button>
          <button onClick={onClickCopyButton1216} disabled={!convertedData2}>クリップボードにコピー</button>
        </div>
      </div>
      <div style={{width: "90%", margin: "auto", textAlign:"left"}}>
        <ul>
          <li>スマレジからダウンロードするときに"Windows (shift-jis)"を選択したファイルを使用してください</li>
          <li>ダウンロードされたファイルはWindows向けに作成されています。Macで開くと文字化けが起こります。</li>
          <li>
            クリップボードにコピーをクリックすると、販売点数の列だけがクリップボードにコピーされます。
            Excel上にそのまま貼り付けることができます。
          </li>
        </ul>  
      </div>
      <hr />
      <div style={{marginTop: 20}}>
        <div style={{fontSize: 18}}>変更履歴</div>
        <div style={{marginTop: 10, textAlign: "left", fontSize: 12}}>
          <p>
            2021/12/06 17:00<br />
            <ul>
              <li>「【ごちうさ】売上管理表1216更新 .xlsx」に対応。</li>
              <ul>
                <li>旧94番「ご当地ティッピーTシャツ-REVIVAL-」(4573190000000)を削除。それに伴い旧95番以降は1番ずつ移動。(ex. 95-&lt;94)</li>
                <li>旧265番「クリアファイル3枚セット＜ご注文はオーケストラですか？＞」(4573189373198) 以降に新規商品25点を追加。</li>
                <li>末尾に「レジ袋」(123456789012) を追加。</li>
                <li>総登録数290点。</li>
              </ul>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
