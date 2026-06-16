import re
import urllib.parse
import xml.etree.ElementTree as ET
import requests
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def strip_html(html_content):
    # Remove HTML tags using a basic regex
    clean_re = re.compile(r'<[^>]*>')
    text = re.sub(clean_re, '', html_content)
    # Decode basic HTML entities
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
    # Normalize whitespace
    text = ' '.join(text.split())
    return text

def parse_release_notes(xml_content):
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        print(f"XML Parsing Error: {e}")
        return []

    # Atom Namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    
    # Iterate through all entries in the Atom feed
    for entry in root.findall('atom:entry', ns):
        title_el = entry.find('atom:title', ns)
        updated_el = entry.find('atom:updated', ns)
        link_el = entry.find('atom:link[@rel="alternate"]', ns)
        if link_el is None:
            link_el = entry.find('atom:link', ns)
        content_el = entry.find('atom:content', ns)
        
        date_str = title_el.text if title_el is not None else "Unknown Date"
        updated_str = updated_el.text if updated_el is not None else ""
        link_url = link_el.attrib.get('href') if link_el is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        raw_html = content_el.text if content_el is not None else ""
        
        # Now, parse individual updates within the entry's HTML
        # In Google release notes, they are separated by <h3>Type</h3>
        # We split by '<h3>' to get each individual sub-update.
        updates = []
        
        if '<h3>' in raw_html:
            parts = raw_html.split('<h3>')
            for part in parts:
                if not part.strip():
                    continue
                # Each part is like "Feature</h3><p>...</p>" or "Issue</h3><p>...</p>"
                if '</h3>' in part:
                    subparts = part.split('</h3>', 1)
                    type_name = subparts[0].strip()
                    desc_html = subparts[1].strip()
                else:
                    type_name = "Update"
                    desc_html = part.strip()
                
                clean_text = strip_html(desc_html)
                updates.append({
                    "type": type_name,
                    "html": desc_html,
                    "text": clean_text
                })
        else:
            # Fallback if no <h3> tags are present
            if raw_html.strip():
                clean_text = strip_html(raw_html)
                updates.append({
                    "type": "Update",
                    "html": raw_html.strip(),
                    "text": clean_text
                })
        
        entries.append({
            "date": date_str,
            "updated": updated_str,
            "link": link_url,
            "updates": updates
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        releases = parse_release_notes(response.content)
        return jsonify({
            "status": "success",
            "releases": releases
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
