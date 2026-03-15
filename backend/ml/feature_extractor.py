import zipfile

def extract_features(zip_path):

    text = ""

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:

        files = zip_ref.namelist()

        # filenames
        for f in files:
            text += f.lower() + " "

        # read useful files
        for f in files:

            if f.endswith((".py",".js",".java",".txt",".md",".json")):

                try:
                    with zip_ref.open(f) as file:
                        content = file.read().decode("utf-8", errors="ignore")
                        text += content.lower()

                except:
                    pass

    return text