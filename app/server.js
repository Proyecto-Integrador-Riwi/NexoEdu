import express from "express"
import countries from "../json/middle_east.json" with { type: 'json' }
const app= express()
const port= 5000
const defaultPath= "/countries"

app.use(express.json())

app.get("/countries", (req, res) => {
    res.send(countries)
})

app.get("/countries/:name", (req, res) => {
    const name= req.params.name.toLocaleLowerCase()
    const country= countries.find(c => c.name.toLocaleLowerCase()=== name)
    if (!country){
        return res.status(404).json({
            error: "Country not found"
        })
    }
    res.send(country)
})

app.listen(port, () => {
    console.log("Showing middle east countries")
})

