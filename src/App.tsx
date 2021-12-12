import './App.css'
import {useDropzone} from "react-dropzone"
import {parse} from "csv-parse/lib/sync"
import {stringify} from "csv-stringify/lib/sync"
import janData from "./final.json"

const convertCSV = async (file: File) => {
  const text = await file.text()

  // parse the data with csv library
  const data: {[key: string]: string}[] = parse(text, {columns: true})

  // add "Item code" to the data by looking up final.json
  // calculate the actual number of items sold 
  const modifiedData = data.map(datum => {
    const newDatum = {...datum}
    newDatum["商品番号"] = "Not found"
    newDatum["販売点数 (net)"] = "Error" 
    // @ts-ignore
    if (janData[datum["商品コード"]]) {
      // @ts-ignore
      newDatum["商品番号"] = janData[datum["商品コード"]]
    }
    newDatum["販売点数 (net)"] = (parseFloat(datum["販売点数"]) - parseFloat(datum["返品数"])).toString(10)
    return newDatum
  })

  // split the items into 3: new, old, not-found
  // and sort them in their categories by item-number
  const sortNewItems = (items: {[key:string]: string}[]) => {
    return items.sort((a, b) => {
      const aItemCode = a["商品番号"]
      const bItemCode = b["商品番号"]
      return aItemCode > bItemCode? 1: -1
    })
  }
  const sortOldItems = (items: {[key:string]: string}[]) => {
    return items.sort((a, b) => {
      const aItemCode = parseFloat(a["商品番号"])
      const bItemCode = parseFloat(b["商品番号"])
      return aItemCode > bItemCode? 1: -1  
    })
  }
  const newArrivals = sortNewItems(modifiedData.filter(datum => datum["商品番号"].startsWith("新")))
  const old = sortOldItems(modifiedData
    .filter(datum => !datum["商品番号"].startsWith("新"))
    .filter(datum => datum["商品番号"] !== "Not found")
  )
  const notFound = modifiedData.filter(datum => datum["商品番号"] === "Not found")
  console.log(newArrivals.length, old.length, notFound.length)
  // joint them 
  const finalData = newArrivals.concat(old).concat(notFound)

  return stringify(finalData, {
    header: true,
    columns: [{key: "商品番号"}, {key: "商品コード"}, {key: "商品名"}, {key: "部門名"}, {key: "純売上"}, {key: "純売上(税抜)"}, {key: "消費税"}, {key: "原価"}, {key: "純売上構成比"}, {key: "販売点数"}, {key: "返品数"}, {key: "販売点数 (net)"}, {key: "販売点数構成比"}, {key: "在庫数"}]
  })
}



function App() {
  const {acceptedFiles, getRootProps, getInputProps} = useDropzone()

  const file = acceptedFiles.length === 0? null: acceptedFiles[0]
  
  const downloadCSV = (csvData: string) => {
    const aElement = document.createElement("a")
    const tempFile = new Blob([csvData], {type: "text/plain"})
    aElement.href = URL.createObjectURL(tempFile)
    aElement.download = file? file.name : "newfile.csv"
    document.body.appendChild(aElement)    
    aElement.click()
  }

  const onClickButton = async () => {
    
    if (file) {
      const data = await convertCSV(file)
      console.log(data)
      downloadCSV(data)
    }
  }

  return (
    <div className="App">
      <div>
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <p>Drag 'n' drop some files here, or click to select files</p>
        </div>
      </div>  
      <button onClick={onClickButton} disabled={!file}>Click to download the converted data.</button>
    </div>
  );
}

export default App;
