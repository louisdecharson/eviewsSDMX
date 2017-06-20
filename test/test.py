# AUTOMATIC PROCEDURES TO TESTS URLS

# How it works:
# open a console, cd to the dir and type :
# python test.py


# IMPORT PACKAGES
import requests as r
import json as json
import argparse as argparse

# LOAD JSON
file_urls_tested = open('urls.json')
urls_tested = json.load(file_urls_tested) 

# RUN TESTS
def main(protocol,host):
    for provider in urls_tested['paths']:
        print("Testing " + provider)
        for test in urls_tested['paths'][provider]:
            url = protocol + host + urls_tested['paths'][provider][test]
            print(url);
            req = r.get(url,timeout=10,allow_redirects=False)
            if req.status_code == 200:
                print(test + ': ' + 'OK')
            elif req.status_code == 302:
                print(test+ ': ' + 'Redirects to ' + req.headers['Location'])
            else:
                print(test + ': ERROR ' + str(req.status_code) + ' | retreiving: ' + url)
        print('--------------------')

    
if __name__ == '__main__':
    parser  = argparse.ArgumentParser()
    parser.add_argument('-p','--protocol',dest='protocol',help='protocol')
    parser.add_argument('-ho','--host',dest='host',help='host')
    parser.set_defaults(protocol=urls_tested['protocol'],host=urls_tested['host'])
    args = parser.parse_args()
    main(args.protocol,args.host)
    
