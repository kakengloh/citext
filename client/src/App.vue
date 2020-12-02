<template>

  <div id="app">
    
    <b-container>
      
      <b-form @submit.prevent="submit">

        <b-container class="mb-4">
          <b-row>
            <b-form-group label="Format" label-for="format-input" label-align="left">
              <b-form-radio-group
                id="format-input"
                v-model="form.format"
                :options="dropdown.formats"
                required
              ></b-form-radio-group>
            </b-form-group>
          </b-row>
        </b-container>

        <b-container class="mb-4">
          <b-row>
            <b-form-group label="Source type" label-for="source-type-input" label-align="left">
              <b-form-radio-group
                id="source-type-input"
                v-model="form.sourceType"
                :options="dropdown.sourceTypes"
                required
              ></b-form-radio-group>
            </b-form-group>
          </b-row>
        </b-container>

        <b-container class="mb-4">
          <b-row>
            <b-form-group label="Method" label-for="method-input" label-align="left">
              <b-form-radio-group
                id="method-input"
                v-model="method"
                :options="dropdown.methods"
                required
              ></b-form-radio-group>
            </b-form-group>
          </b-row>
        </b-container>
        
        <div v-if="method == 'file'">
          <b-form-group class="mb-4" label="File" label-for="file-input" label-align="left">
            <b-form-file v-model="form.file" id="file-input" accept=".doc, .docx" required></b-form-file>
          </b-form-group>

          <b-form-group v-if="form.sources.length" class="mb-4" label="Sources" label-for="file-input" label-align="left">
            <b-list-group>
              <b-list-group-item class="text-left d-flex justify-content-between align-items-center" v-for="(source, i) in form.sources" :key="i">
                {{ source.url }}
                <b-badge variant="primary" pill>{{ source.type.charAt(0).toUpperCase() + source.type.slice(1) }}</b-badge>
              </b-list-group-item>
            </b-list-group>
          </b-form-group>
        </div>

        <b-form-group v-else class="mb-4" label="Sources" label-for="sources-input" label-align="left" description="Separate each source on a new line">
          <b-form-textarea
            v-model="form.sourcesText"
            id="sources-input"
            :placeholder="'https://google.com\nhttps://facebook.com'"
            rows="3"
            max-rows="15"
            required
          ></b-form-textarea>
        </b-form-group>

        <b-progress v-if="loading" :value="progress" variant="primary" striped animated></b-progress>

        <b-container v-else>
          <b-row class="justify-content-start">
            <b-button type="submit" variant="primary" class="mr-2">Submit</b-button>
          </b-row>
        </b-container>
        
      </b-form>

      <b-card-group deck class="my-5" v-if="results.length">

        <b-card no-body header="Results">

          <b-list-group flush>
            <b-list-group-item class="text-left" v-for="(result, i) in results" :key="i">
              <p>
                <b-icon @click="$clipboard(result.inText)" icon="clipboard" variant="success" class="mr-2" style="cursor: pointer;"></b-icon><strong>In-text:</strong> {{result.inText}}
              </p>
              <p>
                <b-icon @click="$clipboard(result.reference)" icon="clipboard" variant="success" class="mr-2" style="cursor: pointer;"></b-icon><strong>Reference:</strong> {{result.reference}}
              </p>
            </b-list-group-item>
          </b-list-group>

          <b-card-body class="text-left">
            <b-icon @click="$clipboard(compiledReference)" icon="clipboard" variant="success" class="mr-2" style="cursor: pointer;"></b-icon><span style="white-space: pre-wrap;"><strong>Compiled reference:</strong> {{'\n\n' + compiledReference}}</span>
          </b-card-body>

        </b-card>

      </b-card-group>

    </b-container>

  </div>

</template>

<script>

import mammoth from 'mammoth'
import doiRegex from 'doi-regex'
import urlRegex from 'url-regex'

export default {

  name: 'App',
  
  data: () => ({
    form: {
      sourceType: 'website',
      format: 'harvard',
      file: null,
      sources: [],
      sourcesText: '',
    },
    dropdown: {
      sourceTypes: [
        { text: 'Website', value: 'website' },
        { text: 'Journal', value: 'journal' },
        { text: 'Book', value: 'book' }
      ],
      formats: [
        { text: 'Harvard', value: 'harvard' },
        { text: 'APA', value: 'apa' },
      ],
      methods: [
        { text: 'File upload', value: 'file' },
        { text: 'Manual input', value: 'input' },
      ]
    },
    method: 'file',
    isFileUpload: true,
    results: [],
    errors: [],
    loading: false,
    progress: 0,
  }),

  computed: {
    compiledReference() {
      return this.results.map(result => result.reference).sort().join('\n\n')
    }
  },

  watch: {
    'form.file': {
      handler(file) {

        if(!file) return

        let reader = new FileReader()

        reader.onload = async e => {

          const { result } = e.target

          const text = await mammoth.extractRawText({ arrayBuffer: result })

          let lines = text.value
          .split('\n')
          .map(line => line.split(' ').join('').trim())

          let tempLines = []

          lines.forEach(line => {
            
            if(doiRegex().test(line)) {

              tempLines.push({ type: 'journal', url: line })

            } else if(urlRegex().test(line)) {

              tempLines.push({ type: 'website', url: line })

            }

          })

          lines = [...new Set(tempLines)]

          this.form.sources = lines

        }

        reader.readAsArrayBuffer(file)

      }
    }
  },

  methods: {

    async submit() {

      // if(this.method == 'file') {

      //   await fetch('https://citethis.herokuapp.com/cite', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(this.form),
      //   })

      //   return

      // }

      const sources = this.method == 'file'
        ? this.form.sources.map(source => source.url)
        : this.form.sourcesText.trim().split('\n').map(source => source.split(' ').join('').trim())

      this.loading = true
      this.progress = 0
      this.results = []

      for(const source of sources) {

        try {

          let res

          res = await fetch('http://localhost:5000/cite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({...this.form, source}),
          })

          let data = await res.json()

          this.results.push(data)

          this.progress = (this.results.length / sources.length) * 100

        } catch(e) {
          console.error(e)
        }

      }

      this.loading = false

    },

  },

  created() {
    fetch('https://citethis.herokuapp.com')
  }

}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
