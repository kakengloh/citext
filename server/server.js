const puppeteer = require('puppeteer')
const express = require('express')
const cors = require('cors')
// const exphbs  = require('express-handlebars')
const doiRegex = require('doi-regex')
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

app.get('/', (_, res) => res.sendStatus(200))

app.post('/cite', async (req, res) => {

    const { sourceType, source, format } = req.body

    let browser

    let inputSelector = '#autociteUrl'

    let isDoi = doiRegex().test(source)

    let result = {}

    switch (sourceType) {

        case 'website':
            inputSelector = '#autociteUrl'
            break;

        case 'journal':
            inputSelector = '#jrQry'
            break;

        case 'journal':
            inputSelector = '#bkQry'
            break;

        default:
            inputSelector = '#autociteUrl'
            break;
    }

    try {

        browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: false })

        const page = await browser.newPage()

        await page.goto(`https://www.citethisforme.com/${format}/source-type`)

        const sourceTypeButton = await page.waitForSelector(`a[href="/cite/${sourceType}"]`)
        await sourceTypeButton.click()

        await page.goto(`https://www.citethisforme.com/cite/${sourceType}`)

        const inputTextField = await page.waitForSelector(inputSelector)
        await inputTextField.type(source, { delay: 20 })

        const citeButton = await page.waitForSelector('.button.cite-btn.btn-blue')
        await citeButton.click()

        isDoi = false // temp solution

        if(!isDoi) {

            await page.waitForSelector('.button.citation-btn.btn-blue')

            let resultButtons = await page.$$('.button.citation-btn.btn-blue')

            if(resultButtons.length < 1) {
                return res.json({ success: false, message: 'No results found'})
            }

            await resultButtons[0].click()

        }

        const continueButton = await page.waitForSelector('.button.continue-btn.btn-blue')
        await continueButton.click()

        if(!isDoi) {
            const submitButton = await page.waitForSelector('#js-submit-form')
            await submitButton.click()
        }

        await page.waitForSelector('#js-reference-string-0')

        const inText = await page.$eval('#js-intext-string-0', el => el.textContent)
        const reference = await page.$eval('#js-reference-string-0', el => el.textContent)

        result = { inText, reference }

    } catch(e) {

        console.error(e)

        result = { success: false, error: e }

    } finally {

        const pages = await browser.pages()

        await Promise.all(pages.map(page => page.close()))

        await browser.close()

        return res.json(result)

    }

})

app.listen(port, () => console.log(`Server is running on port: ${port}`))