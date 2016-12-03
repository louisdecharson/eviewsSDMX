' Copyright (C) 2016 Louis de Charsonville

' This program is free software: you can redistribute it and/or modify
' it under the terms of the GNU Affero General Public License version 3 as
' published by the Free Software Foundation.

' This program is distributed in the hope that it will be useful,
' but WITHOUT ANY WARRANTY; without even the implied warranty of
' MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
' GNU General Public License for more details.

' You should have received a copy of the GNU General Public License
' along with this program.  If not, see <http://www.gnu.org/licenses/>.

subroutine sdmx(string %provider, string %series, string %filters, string %rename)

        ' Api Key Quandl & BLS 
        %__quandl = "" ' PUT YOUR API KEY BETWEEN THE QUOTES
        %__bls = "" ' PUT YOUR API KEY BETWEEN THE QUOTES
        %__fred = "" ' PUT YOUR API KEY BETWEEN THE QUOTES
        
        %__app = "http://sdmx.herokuapp.com/"
        %__url = %__app
        
        if %provider = "quandl" or %provider = "bls" or %provider = "fred" then
                %__url = %__url + %provider + "/" + %__{%provider} + "/" + %series + %filters
                if @len(%rename) > 0 then
                        import(t=html) %__url names=("date",%rename)
                else
                        import(t=html) %__url
                endif
        else
                if %provider = "ecb" or %provider = "insee" or %provider = "eurostat" then
                        %__url = %__url + %provider + "/" + "series/" + %series + %filters
                        if @len(%rename) > 0 then
                                import(t=html) %__url colhead=2 namepos=none names=("date",%rename)
                        else
                                import(t=html) %__url colhead=2 namepos=first
                        endif
                else
                        %__url = %__url + "req?url=" + "'"  + %series + "'"
                        if @len(%rename) > 0 then
                                import(t=html) %__url colhead=2 namepos=none names=("date",%rename)
                        else
                                import(t=html) %__url colhead=2 namepos=first
                        endif
                endif
        endif       
endsub
